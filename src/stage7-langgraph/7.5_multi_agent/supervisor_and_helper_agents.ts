import 'dotenv/config'
import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'

/* -------------------------
   1) Shared State Definition
   ------------------------- */
const StateAnnotation = Annotation.Root({
  ticket: Annotation<string>({ reducer: (_c, u) => u ?? _c }),
  category: Annotation<string>({ reducer: (_c, u) => u ?? _c }), // technical | billing | general
  analysis: Annotation<string>({ reducer: (_c, u) => u ?? _c }),
  resolution: Annotation<string>({ reducer: (_c, u) => u ?? _c }),
  needs_escalation: Annotation<boolean>({ reducer: (_c, u) => (u === undefined ? _c : u) }),
  final: Annotation<string>({ reducer: (_c, u) => u ?? _c }),
})

/* -------------------------
   2) LLM setup
   ------------------------- */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini', // change if needed
  temperature: 0.2,
})

/* -------------------------
   3) Classifier agent
   ------------------------- */
const classifierPrompt = ChatPromptTemplate.fromTemplate(`
You are a support ticket classifier and escalation detector.

Given the customer's ticket, first determine if it needs IMMEDIATE ESCALATION:
- Security breaches, data leaks, unauthorized access
- Legal issues, compliance violations, regulatory concerns
- Critical system outages affecting many users
- Sensitive personal information exposure
- Threats, harassment, or safety concerns

If escalation is needed, return: "escalation"

Otherwise, classify into one of:
- "technical" (for app/device/connection problems)
- "billing" (for payments, refunds, invoices)
- "general" (for other queries)

Return exactly one token: escalation, technical, billing, or general.

Ticket:
{ticket}
`)

const classifierChain = RunnableSequence.from([classifierPrompt, model, (o) => o.content.trim().toLowerCase()])

async function classifierNode(state: typeof StateAnnotation.State) {
  const category = await classifierChain.invoke({ ticket: state.ticket })
  console.log('🔎 Classifier ->', category)

  // If classifier detects escalation, set the flag
  const needsEscalation = category === 'escalation'

  return {
    category: needsEscalation ? 'general' : category, // Category doesn't matter if escalation is needed
    needs_escalation: needsEscalation,
  }
}

/* -------------------------
   4) Troubleshooter agent
   ------------------------- */
const troubleshootPrompt = ChatPromptTemplate.fromTemplate(`
You are a technical troubleshooter.
User ticket: {ticket}

- Provide short actionable steps to resolve the user's technical issue.
- If this issue cannot be resolved via standard troubleshooting steps and requires escalation, respond with the single word: ESCALATE
- Otherwise return troubleshooting steps (multi-line allowed).

Return either "ESCALATE" or step-by-step instructions.
`)

const troubleshootChain = RunnableSequence.from([troubleshootPrompt, model, (o) => o.content.trim()])

async function troubleshooterNode(state: typeof StateAnnotation.State) {
  const resolution = await troubleshootChain.invoke({ ticket: state.ticket })
  const needs_escalation = resolution.toUpperCase().includes('ESCALATE')
  console.log('🛠️ Troubleshooter result, escalate?', needs_escalation)
  return { resolution, needs_escalation }
}

/* -------------------------
   5) Billing agent
   ------------------------- */
const billingPrompt = ChatPromptTemplate.fromTemplate(`
You are a billing agent.
User ticket: {ticket}

- If you can provide a clear billing resolution (refund steps, invoice instructions, check payment status), return those steps.
- If the issue must be handled by a human (e.g., suspicious charge, compliance), return the single word: ESCALATE
`)

const billingChain = RunnableSequence.from([billingPrompt, model, (o) => o.content.trim()])

async function billingNode(state: typeof StateAnnotation.State) {
  const resolution = await billingChain.invoke({ ticket: state.ticket })
  const needs_escalation = resolution.toUpperCase().includes('ESCALATE')
  console.log('💳 Billing result, escalate?', needs_escalation)
  return { resolution, needs_escalation }
}

/* -------------------------
   6) Escalation node (HITL ready)
   ------------------------- */
async function escalationNode(state: typeof StateAnnotation.State) {
  // For now this is a simple automated escalation message.
  // (You could replace this with `interrupt()` to pause and wait for a human.)
  console.log('⚠️ Escalation node reached — ticket will be forwarded to human support.')
  const resolution = `This ticket has been escalated to a human specialist. Description: "${state.ticket.slice(
    0,
    200,
  )}"`
  return { resolution, needs_escalation: true }
}

/* -------------------------
   7) Finisher node (compose final reply)
   ------------------------- */
const finalPrompt = ChatPromptTemplate.fromTemplate(`
You are a customer support agent composing the final reply.

Ticket: {ticket}
Category: {category}
Proposed resolution: {resolution}

Write a short, polite, helpful final message to the customer that:
- Restates the resolution in simple terms
- Sets expectations (if escalated, say a human will follow up)
- Includes next steps and contact guidance

Return the final message only.
`)

const finalChain = RunnableSequence.from([finalPrompt, model, (o) => o.content.trim()])

async function finisherNode(state: typeof StateAnnotation.State) {
  const final = await finalChain.invoke({
    ticket: state.ticket,
    category: state.category,
    resolution: state.resolution,
  })
  console.log('✅ Finisher composed final message.')
  return { final }
}

/* -------------------------
   8) Supervisor node (manager)
   ------------------------- */
async function supervisorNode(state: typeof StateAnnotation.State) {
  // Supervisor logic: prefer escalation first if flagged,
  // otherwise pick agent based on category.
  console.log('🟪 Supervisor evaluating state:', {
    category: state.category,
    needs_escalation: state.needs_escalation,
    resolutionPreview: state.resolution?.slice(0, 80),
  })

  // Priority 1: If escalation is needed (from classifier or previous nodes), route to escalation
  if (state.needs_escalation) {
    console.log('🟪 Supervisor: Escalation needed, routing to escalation')
    return { needs_escalation: true }
  }

  // Priority 2: Route based on category - fallback to finisher for general
  console.log('🟪 Supervisor: Routing based on category:', state.category)
  // Note: The actual routing happens in the conditional edges function below
  return {}
}

/* -------------------------
   9) Build the graph & routing
   ------------------------- */
const workflow = new StateGraph(StateAnnotation)
  .addNode('classifier', classifierNode)
  .addNode('supervisor', supervisorNode)
  .addNode('troubleshooter', troubleshooterNode)
  .addNode('billing', billingNode)
  .addNode('escalation', escalationNode)
  .addNode('finisher', finisherNode)

  // Start -> classify -> supervisor -> specialists -> finisher -> END
  .addEdge(START, 'classifier')
  .addEdge('classifier', 'supervisor')

  // Supervisor routes directly to appropriate worker
  .addConditionalEdges(
    'supervisor',
    (state) => {
      console.log('🚦 Supervisor state at conditional edges...', state)

      // Priority 1: Check if escalation is needed (from classifier or previous nodes)
      if (state.needs_escalation) {
        console.log('✅ Supervisor routing to escalation (flagged)')
        return 'escalation'
      }

      // Priority 2: Route based on category
      const category = (state.category || '').toLowerCase()
      const nextNode = category === 'technical' ? 'troubleshooter' : category === 'billing' ? 'billing' : 'finisher'

      console.log('✅ Supervisor routing to...', nextNode)
      return nextNode
    },
    {
      technical: 'troubleshooter',
      billing: 'billing',
      general: 'finisher',
      escalation: 'escalation',
      finisher: 'finisher',
    },
  )

  // After troubleshooter/billing we check if escalation is required
  .addConditionalEdges(
    'troubleshooter',
    (state) => {
      console.log('🚦 Troubleshooter state at conditional edges...', state)
      const nextNode = state.needs_escalation ? 'escalate' : 'done'
      console.log('✅ Troubleshooter routing to...', nextNode)
      return nextNode
    },
    {
      escalate: 'escalation',
      done: 'finisher',
    },
  )
  .addConditionalEdges('billing', (state) => (state.needs_escalation ? 'escalate' : 'done'), {
    escalate: 'escalation',
    done: 'finisher',
  })

  .addEdge('escalation', 'finisher')
  .addEdge('finisher', END)

/* -------------------------
   10) Compile and demo runner
   ------------------------- */
const app = workflow.compile()

async function demoTicket(ticketText: string) {
  console.log('\n==============================================')
  console.log('▶ Running ticket through Supervisor Graph')
  console.log('Ticket:', ticketText)
  console.log('==============================================\n')

  const result = await app.invoke({
    ticket: ticketText,
  })

  console.log('\n--- Final Structured State ---')
  console.log('category:', result.category)
  console.log('resolution:', result.resolution)
  console.log('needs_escalation:', result.needs_escalation)
  console.log('\n--- Final Customer Reply ---\n')
  console.log(result.final)
  console.log('\n==============================================\n')
}

/* -------------------------
   11) Run a few demo examples
   ------------------------- */
async function main() {
  // Technical example
  // await demoTicket('My mobile app crashes when I try to upload a photo. It shows an error and force-closes.')

  // Billing example
  // await demoTicket('I was charged twice for my subscription and need a refund. Transaction ID: 0x1234')

  // General example
  // await demoTicket('How do I change my account email address and where can I update my profile picture?')

  // Escalation example (should go directly to escalation, bypassing troubleshooter/billing)
  await demoTicket(
    'I noticed unauthorized access to my account and my personal data has been leaked. This is a security breach!',
  )
}

main().catch(console.error)

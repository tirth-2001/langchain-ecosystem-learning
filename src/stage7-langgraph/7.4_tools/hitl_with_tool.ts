/**
 * graph-hitl-tool.ts
 *
 * 7.4.4 — HITL + Tool Node Demo
 */
import 'dotenv/config'
import { Annotation, StateGraph, START, END, interrupt, Command, MemorySaver } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'

// ======================
// 1) State definition
// ======================
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  route: Annotation<string>(),
  toolArgs: Annotation<string>({ reducer: (_, u) => u ?? _ }),
  approved: Annotation<boolean | null>({ reducer: (c, u) => (u === undefined ? c : u) }),
  toolResult: Annotation<string>({ reducer: (_, u) => u ?? _ }),
  final: Annotation<string>({ reducer: (_, u) => u ?? _ }),
})

// ======================
// 2) Model (LLM)
// ======================
const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

// ======================
// 3) Nodes
// ======================

// 3.1 Classifier — decide tool vs LLM
const classifyPrompt = ChatPromptTemplate.fromTemplate(`
Classify whether the user input requires a calculator ("tool") or can be answered by LLM ("llm").
Return a single word: tool or llm.

User: "{input}"
`)
const classifyChain = RunnableSequence.from([classifyPrompt, model, (o) => o.content.trim().toLowerCase()])

async function classifierNode(state: typeof StateAnnotation.State) {
  const route = await classifyChain.invoke({ input: state.input })
  console.log('Classifier ->', route)
  if (route === 'tool') {
    // set tool arguments (for demo we simply pass the input expression)
    return { route, toolArgs: state.input }
  }
  return { route }
}

// 3.2 Approval Node — pause & request human approval
async function approvalNode(state: typeof StateAnnotation.State) {
  console.log('Approval node reached. Tool args:', state.toolArgs)

  // Pause: show prompt + draft/toolArgs. UI should capture resume payload.
  const resumePayload = interrupt({
    prompt: `Approve or deny execution of the tool for expression: "${state.toolArgs}". Return { approved: true } or { approved: false }`,
    data: { toolArgs: state.toolArgs },
  })

  // On resume, Command.resume payload will be returned here.
  const approved = !!resumePayload?.approved
  console.log('Approval resumed with:', approved)
  return { approved }
}

// 3.3 Tool execution (calculator)
function calculatorTool(expression: string): number | null {
  try {
    const safeExpr = expression.replace(/[^0-9+\-*/().\s]/g, '')
    // eslint-disable-next-line no-eval
    const val = eval(safeExpr)
    if (typeof val === 'number' && Number.isFinite(val)) return val
    return null
  } catch {
    return null
  }
}

async function toolExecuteNode(state: typeof StateAnnotation.State) {
  console.log('Executing tool with args:', state.toolArgs)
  const out = calculatorTool(state.toolArgs ?? '')
  if (out === null) {
    return { toolResult: 'Error: tool execution failed' }
  }
  return { toolResult: out.toString() }
}

// 3.4 Tool answer formatter (LLM)
const toolAnswerPrompt = ChatPromptTemplate.fromTemplate(`
User asked: {input}
Tool output: {toolResult}

Write a brief, friendly final answer combining both.
`)
const toolAnswerChain = RunnableSequence.from([toolAnswerPrompt, model, (o) => o.content.trim()])

async function toolAnswerNode(state: typeof StateAnnotation.State) {
  const final = await toolAnswerChain.invoke({ input: state.input, toolResult: state.toolResult ?? '' })
  return { final }
}

// 3.5 LLM fallback/deny node
const fallbackPrompt = ChatPromptTemplate.fromTemplate(`
  You are a helpful assistant.
  User asked: {input}
  
  If a tool result is available, use it: {toolResult}
  Otherwise answer conversationally.
  `)

const fallbackChain = RunnableSequence.from([fallbackPrompt, model, (o) => o.content.trim()])

async function llmAnswerNode(state: typeof StateAnnotation.State) {
  const answer = await fallbackChain.invoke({
    input: state.input,
    toolResult: state.toolResult ?? 'No tool result',
  })
  return { final: answer }
}

// ======================
// 4) Graph wiring with conditional edges
// ======================

const workflow = new StateGraph(StateAnnotation)
  .addNode('classifier', classifierNode)
  .addNode('approval', approvalNode)
  .addNode('toolExec', toolExecuteNode)
  .addNode('toolAnswer', toolAnswerNode)
  .addNode('llmAnswer', llmAnswerNode)
  .addEdge(START, 'classifier')
  // classifier decides: 'tool' -> approval, 'llm' -> llmAnswer
  .addConditionalEdges('classifier', (state) => state.route, {
    tool: 'approval',
    llm: 'llmAnswer',
  })
  // approval routes to toolExec if approved, else llmAnswer
  .addConditionalEdges('approval', (state) => (state.approved ? 'approved' : 'denied'), {
    approved: 'toolExec',
    denied: 'llmAnswer',
  })
  .addEdge('toolExec', 'toolAnswer')
  .addEdge('toolAnswer', END)
  .addEdge('llmAnswer', END)

// Checkpointer (MemorySaver for demo). Use Redis/Mongo saver for production.
const checkpointer = new MemorySaver()

const app = workflow.compile({
  checkpointer, // required for interrupts to resume properly
})

// ======================
// 5) Demo runner — simulate approval / denial with Command.resume
// ======================
async function runDemoApproveThenDeny() {
  const threadId = 'hitl-demo-thread-1'
  const config = { configurable: { thread_id: threadId } }

  console.log('\n=== 7.4.4 — HITL + Tool Demo (APPROVE flow) ===\n')

  // STEP 1: initial invoke — will pause at approvalNode
  console.log('STEP 1: Invoke and pause for approval...')
  const paused = await app.invoke({ input: 'Compute 12 * (8 + 2)' }, config)

  console.log('\nGraph paused. State snapshot: ', {
    input: paused.input,
    route: paused.route,
    toolArgs: paused.toolArgs,
    approved: paused.approved,
  })

  // Simulate human approval via Command.resume
  console.log('\nSTEP 2: Resume with approval (Command.resume = { approved: true })')
  const resumed = await app.invoke(new Command({ resume: { approved: true } }), config)

  console.log('\nFINAL OUTPUT (after approval):')
  console.log('toolResult:', resumed.toolResult)
  console.log('final:', resumed.final)

  // --- Now demo deny path on a different thread
  const threadId2 = 'hitl-demo-thread-2'
  const cfg2 = { configurable: { thread_id: threadId2 } }

  console.log('\n\n=== Now DEMO DENY flow ===\n')
  console.log('STEP 1: Invoke and pause for approval (deny path)...')
  const paused2 = await app.invoke({ input: 'Compute 5 * 5' }, cfg2)

  console.log('\nGraph paused (deny path). Snapshot:', {
    input: paused2.input,
    route: paused2.route,
    toolArgs: paused2.toolArgs,
    approved: paused2.approved,
  })

  console.log('\nSTEP 2: Resume with denial (Command.resume = { approved: false })')
  const resumed2 = await app.invoke(new Command({ resume: { approved: false } }), cfg2)

  console.log('\nFINAL OUTPUT (after denial):')
  console.log('toolResult:', resumed2.toolResult) // likely undefined
  console.log('final:', resumed2.final)
}

runDemoApproveThenDeny().catch((e) => {
  console.error('Demo error:', e)
  process.exit(1)
})

import { Annotation, StateGraph, END, START, Command, interrupt } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
// NOTE: MemorySaver import path can differ by version:
import { MemorySaver } from '@langchain/langgraph'

import 'dotenv/config'

/**
 * 1) State definition
 * We’re using safer reducers
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>({
    reducer: (current, update) => update ?? current,
  }),
  draft: Annotation<string>({
    reducer: (current, update) => update ?? current,
  }),
  humanFeedback: Annotation<string>({
    reducer: (current, update) => update ?? current,
  }),
  final: Annotation<string | null>({
    reducer: (current, update) => update ?? current,
  }),
  approved: Annotation<boolean | null>({
    reducer: (current, update) => update ?? current,
  }),
})

/**
 * 2) LLM Setup
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.4,
})

const draftPrompt = ChatPromptTemplate.fromTemplate(`
Write a clear and helpful draft response for the following user request:
"{input}"
`)

const draftChain = RunnableSequence.from([draftPrompt, model, (out) => out.content.trim()])

const finalizePrompt = ChatPromptTemplate.fromTemplate(`
User request: {input}
AI Draft: {draft}
Human feedback: {humanFeedback}

Rewrite the final answer to incorporate the human review.
`)

const finalizeChain = RunnableSequence.from([finalizePrompt, model, (out) => out.content.trim()])

/**
 * 3) Nodes
 */

// Node 1: Generate draft
async function draftNode(state: typeof StateAnnotation.State) {
  console.log('  📝 Generating draft...', state)
  const draft = await draftChain.invoke({ input: state.input })
  console.log('  ✅ Draft ready:', draft.slice(0, 100) + '...')
  return { draft }
}

/**
 * Node 2: Human review node
 * Uses interrupt() to pause execution and wait for human feedback.
 * When resumed with Command.resume, the interrupt() returns the feedback value.
 * Note: The node will re-execute from the beginning when resumed.
 */
async function humanReviewNode(state: typeof StateAnnotation.State) {
  console.log('  👤 Human review node reached')
  console.log('  📝 Draft:', state.draft?.slice(0, 80) + '...')

  // Pause execution and wait for human feedback
  // interrupt() will return the value provided in Command.resume when resuming
  console.log('  ⏸️  Pausing for human review...')
  const feedback = interrupt({
    prompt: 'Please review the draft and provide feedback:',
    data: { draft: state.draft },
  })

  // After resume, feedback will contain the value from Command.resume
  console.log('  ✅ Resumed with feedback:', feedback)
  return { humanFeedback: feedback }
}

// Node 3: Finalize with human feedback
async function finalizeNode(state: typeof StateAnnotation.State) {
  console.log('  ⚙️ Finalizing with human feedback...')
  const final = await finalizeChain.invoke({
    input: state.input,
    draft: state.draft,
    humanFeedback: state.humanFeedback || 'No feedback provided',
  })
  console.log('  ✅ Final answer ready')
  return { final }
}

/**
 * 4) Build graph with checkpointer + interrupt point
 */
const checkpointer = new MemorySaver() // Required for interrupt/resume to work!

const workflow = new StateGraph(StateAnnotation)
  .addNode('draftNode', draftNode)
  .addNode('humanReviewNode', humanReviewNode) // pause point (via interrupt() call)
  .addNode('finalizeNode', finalizeNode)
  .addEdge(START, 'draftNode')
  .addEdge('draftNode', 'humanReviewNode')
  .addEdge('humanReviewNode', 'finalizeNode')
  .addEdge('finalizeNode', END)

// 🚦 Key piece: compile with checkpointer (interrupt() handles pausing)
const app = workflow.compile({
  checkpointer, // Required for interrupt() to work
})

/**
 * 5) Demo: run → pause → resume
 */
async function runInterruptDemo() {
  console.log('\n🧪 Running Interrupt-Based HITL Demo\n')

  // Use a stable thread/session id so LangGraph can checkpoint and resume.
  const threadId = 'demo-thread-1'
  const config = { configurable: { thread_id: threadId } }

  // STEP 1: Invoke — runs until interrupt() is called
  console.log('📥 STEP 1: Initial invoke (will pause at interrupt() call)\n')
  const step1 = await app.invoke(
    {
      input: 'Write a friendly follow-up email to a client.',
    },
    config,
  )

  console.log('\n⏸️ GRAPH PAUSED (at interrupt() call)')
  console.log('📊 Current state:', {
    draft: step1.draft?.slice(0, 80) + '...',
    humanFeedback: step1.humanFeedback,
    final: step1.final,
  })

  // Simulate human reviewing and providing feedback externally (UI, Slack, etc.)
  console.log('\n👤 HUMAN REVIEWS DRAFT...')
  const humanFeedback = 'Make it shorter, more casual, and add a gentle call-to-action.'

  // STEP 2: Resume with feedback using Command.resume
  // The Command.resume value will be returned by interrupt() when the node re-executes
  console.log('\n📥 STEP 2: Resuming with feedback using Command.resume\n')

  // Resume execution with human feedback using Command.resume
  // The value passed to resume will be returned by interrupt() in the node
  const step2 = await app.invoke(
    new Command({
      resume: humanFeedback, // This value will be returned by interrupt()
    }),
    config,
  )

  console.log('\n✅ FINAL RESULT:')
  console.log('Input:', step2.input)
  console.log('Draft:', step2.draft)
  console.log('Feedback:', step2.humanFeedback)
  console.log('Final:', step2.final)
}

runInterruptDemo().catch(console.error)

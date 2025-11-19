/**
 * Stage 7 – LangGraph Control Flow: Human-in-the-Loop (HITL) Masterclass
 * Micro-project: Comprehensive guide to human interaction patterns
 *
 * Objectives:
 * 1. Demonstrate the "Interrupt" pattern for pausing graph execution
 * 2. Show how to resume execution with human feedback
 * 3. Compare different HITL approaches (Interrupt vs. Manual Pause vs. Conditional)
 *
 * Core Concepts Covered:
 * - Checkpointing: Saving graph state to allow pausing and resuming
 * - Interrupts: `interruptBefore` / `interruptAfter` configuration
 * - Threading: Managing unique conversation sessions
 * - State Updates: Injecting human feedback into the resumed graph
 */

import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { MemorySaver } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 🎓 COMPLETE GUIDE: Human-in-the-Loop (HITL) in LangGraph
 *
 * KEY CONCEPTS:
 * 1. ❌ There is NO AwaitResponse class in LangGraph!
 * 2. ✅ HITL uses "interrupt" mechanism with checkpointers
 * 3. ✅ Graph pauses at designated "interrupt" nodes
 * 4. ✅ Resume by invoking with updated state + config
 *
 * This file shows 3 approaches:
 * - Approach 1: Basic HITL with interrupt (RECOMMENDED)
 * - Approach 2: Manual pause/resume pattern
 * - Approach 3: Conditional approval (auto-approve vs human review)
 */

// Approach 1 will be logged in main()

/**
 * State definition
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  draft: Annotation<string>(),
  humanFeedback: Annotation<string>(),
  final: Annotation<string>(),
  approved: Annotation<boolean>(),
})

/**
 * LLM Setup
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
 * Node 1: Generate draft
 */
async function draftNode(state: typeof StateAnnotation.State) {
  console.log('  📝 Generating draft...')
  const draft = await draftChain.invoke({ input: state.input })
  console.log('  ✅ Draft ready:', draft.substring(0, 100) + '...')
  return { draft }
}

/**
 * Node 2: Human review node
 * This node does NOTHING - it just passes through
 * The interrupt happens BEFORE this node executes
 */
async function humanReviewNode(state: typeof StateAnnotation.State) {
  console.log('  👤 Human review node reached')
  // Just pass through - human will update state externally
  return {}
}

/**
 * Node 3: Finalize with feedback
 */
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
 * Build graph with interrupt
 */
const checkpointer = new MemorySaver() // Required for interrupts!

const workflow = new StateGraph(StateAnnotation)
  .addNode('draftNode', draftNode)
  .addNode('humanReviewNode', humanReviewNode) // This is the interrupt point
  .addNode('finalizeNode', finalizeNode)
  .addEdge(START, 'draftNode')
  .addEdge('draftNode', 'humanReviewNode')
  .addEdge('humanReviewNode', 'finalizeNode')
  .addEdge('finalizeNode', END)

// ✅ KEY: Compile with checkpointer AND interrupt
const app = workflow.compile({
  checkpointer,
  interruptBefore: ['humanReviewNode'], // Pause BEFORE this node
  // Alternative: interruptAfter: ['draftNode'] - pause AFTER draft node
})

/**
 * Demo: Interrupt-based HITL
 */
async function runInterruptDemo() {
  console.log('\n🧪 Running Interrupt-Based HITL Demo\n')

  const threadId = 'demo-thread-1'
  const config = { configurable: { thread_id: threadId } }

  // Step 1: Run until interrupt
  console.log('📥 STEP 1: Initial invoke (will pause at humanReview)\n')
  const step1 = await app.invoke(
    {
      input: 'Write a friendly follow-up email to a client.',
    },
    config,
  )

  console.log('\n⏸️ GRAPH PAUSED at humanReview node')
  console.log('📊 Current state:', {
    draft: step1.draft?.substring(0, 80) + '...',
    humanFeedback: step1.humanFeedback,
    final: step1.final,
  })

  // Simulate human reviewing and providing feedback
  console.log('\n👤 HUMAN REVIEWS DRAFT...')
  const humanFeedback = 'Make it shorter and more casual. Add a call-to-action.'

  // Step 2: Resume with human feedback
  console.log('\n📥 STEP 2: Resume with feedback\n')
  const step2 = await app.invoke(
    {
      humanFeedback, // Only provide the NEW data
      // No need to re-provide input or draft - they're in checkpoint!
    },
    config,
  )

  console.log('\n✅ FINAL RESULT:')
  console.log('Input:', step2.input)
  console.log('Draft:', step2.draft?.substring(0, 80) + '...')
  console.log('Feedback:', step2.humanFeedback)
  console.log('Final:', step2.final?.substring(0, 100) + '...')
}

// ============================================================================
// APPROACH 2: Manual Pause/Resume Pattern (Alternative)
// ============================================================================

const ManualState = Annotation.Root({
  input: Annotation<string>(),
  draft: Annotation<string>(),
  feedback: Annotation<string>(),
  needsReview: Annotation<boolean>(),
  final: Annotation<string>(),
})

async function draftNode2(state: typeof ManualState.State) {
  console.log('  📝 Draft node')
  return {
    draft: `Draft for: ${state.input}`,
    needsReview: true,
  }
}

async function checkReviewNode(state: typeof ManualState.State) {
  console.log('  🔍 Check review status')
  // If no feedback yet, this is first pass - stay in review mode
  if (!state.feedback) {
    console.log('  ⏸️ No feedback yet - needs review')
    return { needsReview: true }
  }
  // Feedback provided - can proceed
  console.log('  ✅ Feedback received - proceeding')
  return { needsReview: false }
}

async function finalNode2(state: typeof ManualState.State) {
  console.log('  ⚙️ Finalize node')
  return { final: `Final: ${state.draft} | Feedback: ${state.feedback}` }
}

const manualWorkflow = new StateGraph(ManualState)
  .addNode('draftNode', draftNode2)
  .addNode('checkReview', checkReviewNode)
  .addNode('finalNode', finalNode2)
  .addEdge(START, 'draftNode')
  .addEdge('draftNode', 'checkReview')
  .addConditionalEdges('checkReview', (state) => (state.needsReview ? 'wait' : 'proceed'), {
    wait: END, // Exit and wait for feedback
    proceed: 'finalNode',
  })
  .addEdge('finalNode', END)

const manualApp = manualWorkflow.compile()

async function runManualDemo() {
  console.log('\n🧪 Running Manual Pause/Resume Demo\n')

  // First call - generates draft and exits
  console.log('📥 STEP 1: Generate draft\n')
  const result1 = await manualApp.invoke({
    input: 'Write an email',
  })

  console.log('⏸️ Paused - waiting for feedback')
  console.log('Draft:', result1.draft)

  // Simulate getting human feedback
  console.log('\n👤 HUMAN PROVIDES FEEDBACK...\n')

  // Second call - provide feedback and continue
  console.log('📥 STEP 2: Continue with feedback\n')
  const result2 = await manualApp.invoke({
    input: 'Write an email',
    draft: result1.draft,
    feedback: 'Make it more formal',
    needsReview: false, // Signal that review is done
  })

  console.log('✅ Final result:', result2.final)
}

// ============================================================================
// APPROACH 3: Conditional Approval (Auto vs Manual)
// ============================================================================

const ConditionalState = Annotation.Root({
  input: Annotation<string>(),
  draft: Annotation<string>(),
  requiresHumanReview: Annotation<boolean>(),
  humanFeedback: Annotation<string>(),
  final: Annotation<string>(),
  confidence: Annotation<number>(),
})

async function intelligentDraftNode(state: typeof ConditionalState.State) {
  console.log('  📝 Intelligent draft generation')
  const draft = `Draft for: ${state.input}`

  // Simulate confidence score
  const confidence = Math.random()
  const requiresReview = confidence < 0.7

  console.log(`  📊 Confidence: ${confidence.toFixed(2)} - Review: ${requiresReview}`)

  return {
    draft,
    confidence,
    requiresHumanReview: requiresReview,
  }
}

async function autoApproveNode(state: typeof ConditionalState.State) {
  console.log('  ✅ Auto-approved (high confidence)')
  return { final: `[AUTO] ${state.draft}` }
}

async function manualReviewNode(state: typeof ConditionalState.State) {
  console.log('  👤 Requires manual review')
  // In real app, this would pause for human input
  // For demo, we'll simulate feedback
  return { humanFeedback: 'Simulated feedback: Looks good!' }
}

async function finalWithFeedbackNode(state: typeof ConditionalState.State) {
  console.log('  ⚙️ Finalizing with human feedback')
  return { final: `[REVIEWED] ${state.draft} + ${state.humanFeedback}` }
}

const conditionalWorkflow = new StateGraph(ConditionalState)
  .addNode('draftNode', intelligentDraftNode)
  .addNode('autoApprove', autoApproveNode)
  .addNode('manualReview', manualReviewNode)
  .addNode('finalizeReviewed', finalWithFeedbackNode)
  .addEdge(START, 'draftNode')
  .addConditionalEdges('draftNode', (state) => (state.requiresHumanReview ? 'review' : 'auto'), {
    auto: 'autoApprove',
    review: 'manualReview',
  })
  .addEdge('autoApprove', END)
  .addEdge('manualReview', 'finalizeReviewed')
  .addEdge('finalizeReviewed', END)

const conditionalApp = conditionalWorkflow.compile()

async function runConditionalDemo() {
  console.log('\n🧪 Running Conditional Approval Demo\n')

  for (let i = 1; i <= 3; i++) {
    console.log(`\nTest ${i}:`)
    const result = await conditionalApp.invoke({
      input: `Task ${i}`,
    })
    console.log('Result:', result.final)
  }
}

// ============================================================================
// SUMMARY & BEST PRACTICES (will be logged in main())
// ============================================================================
const summaryText = `
🎯 THREE APPROACHES TO HITL:

1️⃣ INTERRUPT-BASED (Recommended for production)
   ✅ Use: interruptBefore or interruptAfter
   ✅ Requires: MemorySaver checkpointer
   ✅ Requires: thread_id in config
   ✅ Resume: invoke with same thread_id + new data
   ✅ Best for: Web apps, async workflows, multi-step reviews

2️⃣ MANUAL PAUSE/RESUME
   ✅ Graph exits at specific point
   ✅ Second invoke continues from where it left off
   ✅ Simpler but requires careful state management
   ✅ Best for: Simple scripts, one-time reviews

3️⃣ CONDITIONAL APPROVAL
   ✅ Automatically route based on confidence
   ✅ High confidence → auto-approve
   ✅ Low confidence → human review
   ✅ Best for: Smart workflows with AI confidence scores

⚠️ COMMON MISTAKES:

❌ Using AwaitResponse (doesn't exist!)
❌ Forgetting checkpointer for interrupts
❌ Not providing thread_id for resume
❌ Expecting graph to "wait" without interrupts
❌ Not handling state properly on resume

✅ BEST PRACTICES:

1. Always use MemorySaver for interrupts
2. Use consistent thread_id across invokes
3. Only provide NEW data on resume (state is preserved)
4. Add timeout logic for human reviews
5. Log interrupt points for debugging
6. Test both auto and manual paths
7. Handle cancellation/expiry of reviews

🔧 PRODUCTION CONSIDERATIONS:

• Store checkpoints in database (not MemorySaver)
• Add timeout for human response
• Implement notification system
• Track review metrics
• Add audit logging
• Support multiple reviewers
• Handle concurrent reviews
• Implement review queues

📖 KEY DOCUMENTATION:

• LangGraph Interrupts: https://langchain-ai.github.io/langgraphjs/how-tos/human_in_the_loop/
• Checkpointers: https://langchain-ai.github.io/langgraphjs/how-tos/persistence/
• State Management: https://langchain-ai.github.io/langgraphjs/concepts/low_level/
`

/**
 * Main function to run all demos
 */
async function main() {
  // Approach 1: Interrupt-based HITL
  console.log('\n' + '='.repeat(70))
  console.log('APPROACH 1: Interrupt-Based HITL (RECOMMENDED)')
  console.log('='.repeat(70))
  await runInterruptDemo()

  // // Approach 2: Manual pause/resume
  // console.log('\n' + '='.repeat(70))
  // console.log('APPROACH 2: Manual Pause/Resume Pattern')
  // console.log('='.repeat(70))
  // await runManualDemo()

  // // Approach 3: Conditional approval
  // console.log('\n' + '='.repeat(70))
  // console.log('APPROACH 3: Conditional Approval Pattern')
  // console.log('='.repeat(70))
  // await runConditionalDemo()

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📚 HITL SUMMARY & BEST PRACTICES')
  console.log('='.repeat(70))
  console.log(summaryText)
  console.log('\n✨ All HITL patterns demonstrated!')
}

// Execute all demos
main().catch(console.error)

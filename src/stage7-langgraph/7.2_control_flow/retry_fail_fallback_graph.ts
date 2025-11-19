/**
 * Stage 7 – LangGraph Control Flow: Reliability Patterns
 * Micro-project: Retry logic and Fallback mechanisms
 *
 * Objectives:
 * 1. Implement a retry wrapper for unstable nodes (flaky APIs)
 * 2. Detect failures after maximum retries are exhausted
 * 3. Route to a fallback node to gracefully handle errors
 *
 * Core Concepts Covered:
 * - Retry Pattern: Automatically retrying failed operations
 * - Error Handling: Catching exceptions within the graph flow
 * - Fallback: Providing a safe default response when things go wrong
 */

import { StateGraph, Annotation, END, START } from '@langchain/langgraph'
import 'dotenv/config'

/**
 * Retry wrapper utility
 * Retries a function with delay between attempts
 */
function retry<TState, TReturn>(
  fn: (state: TState) => Promise<TReturn>,
  options: { retries: number; delay?: number } = { retries: 3 },
): (state: TState) => Promise<TReturn> {
  const { retries, delay = 300 } = options

  return async (state: TState): Promise<TReturn> => {
    let lastError: Error

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn(state)
      } catch (error: any) {
        console.log(`❌ Attempt ${attempt + 1} failed: ${error.message}`)
        lastError = error
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }
}

/**
 * 1️⃣ Define State
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  output: Annotation<string>(),
  error: Annotation<string | null>(),
})

/**
 * 2️⃣ Unstable Node (Fails Randomly)
 * Simulating flaky API / tool
 */
async function riskyNode(state: typeof StateAnnotation.State) {
  console.log('⚠️ Running risky node…')

  // Simulate random failure 50% of time
  if (Math.random() < 0.99) {
    throw new Error('Random failure occurred!')
  }

  return { output: `✅ Success: Processed "${state.input}"`, error: null }
}

/**
 * 3️⃣ Wrap risky node with automatic retries
 */
const safeRiskyNode = retry(riskyNode, {
  retries: 3,
  delay: 300, // optional
})

/**
 * 4️⃣ Fallback Node
 * Executed if retries fail
 */
async function fallbackNode(state: typeof StateAnnotation.State) {
  console.log('🛟 Fallback activated.')
  return {
    output: '⚠️ The system is experiencing issues. Try again later.',
    error: null,
  }
}

/**
 * 5️⃣ Error Handler Node
 * This detects success vs failure
 */
async function errorCheckNode(state: typeof StateAnnotation.State) {
  return { error: state.error }
}

/**
 * 6️⃣ Build the Graph (Control Flow)
 */
const graph = new StateGraph(StateAnnotation)
  .addNode('risky', async (state) => {
    try {
      return await safeRiskyNode(state)
    } catch (e: any) {
      console.log('❌ All retries failed')
      return { error: e.message }
    }
  })
  .addNode('fallback', fallbackNode)
  .addNode('errorCheck', errorCheckNode)
  .addEdge(START, 'risky')
  .addEdge('risky', 'errorCheck')
  .addConditionalEdges(
    'errorCheck',
    (state) => {
      if (!state.error) return 'success'
      return 'fallback'
    },
    {
      success: END,
      fallback: 'fallback',
    },
  )
  .addEdge('fallback', END)

const app = graph.compile()

/**
 * 7️⃣ Run Demo
 */
async function main() {
  console.log('\n=== Retry + Fallback Demo ===')
  const result = await app.invoke({ input: 'Process this task' })
  console.log('\nFINAL STATE:\n', result)
}

main()

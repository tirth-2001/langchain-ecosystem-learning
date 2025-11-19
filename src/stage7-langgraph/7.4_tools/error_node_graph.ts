import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import 'dotenv/config'

/**
 * 1) State Definition
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  result: Annotation<string | null>(),
  error: Annotation<string | null>(),
  toolUsed: Annotation<string | null>(),
})

/**
 * 2) Normal Tool (may throw errors)
 */
async function riskyToolNode(state: typeof StateAnnotation.State) {
  console.log('🔧 riskyToolNode running...')

  // Simulated validation failure
  if (!state.input || state.input.length < 5) {
    throw new Error('Input too short for processing.')
  }

  // Simulated random failure
  if (Math.random() < 0.4) {
    throw new Error('Random failure occurred inside riskyToolNode.')
  }

  const result = `Tool processed successfully: ${state.input}`
  return { result, toolUsed: 'riskyTool' }
}

/**
 * 3) Safe Wrapper Node
 * Wraps the tool in try/catch and stores the error in state.
 */
async function safeToolWrapper(state: typeof StateAnnotation.State) {
  try {
    return await riskyToolNode(state)
  } catch (err: any) {
    console.log('⚠️ safeToolWrapper caught error:', err.message)
    return { error: err.message }
  }
}

/**
 * 4) Error Handling Node
 */
async function errorToolNode(state: typeof StateAnnotation.State) {
  console.log('❌ errorToolNode invoked')

  const fallback = `
The system encountered an error while processing your request.
Error: ${state.error}
Try rephrasing or retrying later.
  `.trim()

  return {
    result: fallback,
    toolUsed: 'errorHandler',
  }
}

/**
 * 5) Final Node
 */
async function finalAnswerNode(state: typeof StateAnnotation.State) {
  console.log('💬 finalAnswerNode reached')
  return { result: state.result }
}

/**
 * 6) Build Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('safeTool', safeToolWrapper)
  .addNode('errorHandler', errorToolNode)
  .addNode('finalAnswer', finalAnswerNode)
  .addEdge(START, 'safeTool')
  .addConditionalEdges('safeTool', (state) => (state.error ? 'has_error' : 'ok'), {
    has_error: 'errorHandler',
    ok: 'finalAnswer',
  })
  .addEdge('errorHandler', 'finalAnswer')
  .addEdge('finalAnswer', END)

const app = workflow.compile()

/**
 * 7) Demo
 */
async function main() {
  const input = 'test' // Try "test" (short → error) or "Process this text"
  const result = await app.invoke({ input })

  console.log('\n🚀 FINAL RESULT:')
  console.log(result)
}

main().catch(console.error)

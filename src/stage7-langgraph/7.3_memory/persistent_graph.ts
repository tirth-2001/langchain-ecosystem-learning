/**
 * Stage 7 – LangGraph Memory: Persistence & Checkpointing
 * Micro-project: Saving and resuming graph state across runs
 *
 * Objectives:
 * 1. Implement a checkpointer (`MemorySaver`) to persist graph state
 * 2. Use `thread_id` to identify and retrieve specific sessions
 * 3. Demonstrate how to resume a conversation from a previous state
 *
 * Core Concepts Covered:
 * - Checkpointers: Mechanisms for saving state (Memory, SQLite, Postgres)
 * - Threading: Isolating different user sessions
 * - Persistence: Retaining context across independent graph invocations
 */

import { Annotation, StateGraph, START, END, MemorySaver } from '@langchain/langgraph'
import 'dotenv/config'

/**
 * 1️⃣ State Definition
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  chatHistory: Annotation<string[]>({
    reducer: (curr, next) => [...(curr ?? []), ...(next ?? [])],
  }),
  response: Annotation<string>(),
})

/**
 * 2️⃣ Memory-based Checkpointer
 * Note: MemorySaver is in-memory only. For file-based persistence, use SqliteSaver from @langchain/langgraph-checkpoint-sqlite
 */
const checkpointer = new MemorySaver()

/**
 * 3️⃣ Simple Nodes
 */
async function memoryInputNode(state: typeof StateAnnotation.State) {
  console.log('🧠 Adding input to chat history...')
  return { chatHistory: [`Human: ${state.input}`] }
}

async function llmNode(state: typeof StateAnnotation.State) {
  console.log('💬 Simulating LLM response...')
  const history = (state.chatHistory ?? []).join('\n')
  const response = `You said: "${state.input}". Previously: [${history}]`
  return { response }
}

async function memoryOutputNode(state: typeof StateAnnotation.State) {
  console.log('🧠 Storing LLM reply...')
  return { chatHistory: [`AI: ${state.response}`] }
}

/**
 * 4️⃣ Build Graph
 */
const graph = new StateGraph(StateAnnotation)
  .addNode('memoryInput', memoryInputNode)
  .addNode('llm', llmNode)
  .addNode('memoryOutput', memoryOutputNode)
  .addEdge(START, 'memoryInput')
  .addEdge('memoryInput', 'llm')
  .addEdge('llm', 'memoryOutput')
  .addEdge('memoryOutput', END)

const app = graph.compile({
  checkpointer,
})

/**
 * 5️⃣ Run Demo
 */
async function main() {
  console.log('\n=== 7.3.4 — Persistent Store Graph ===\n')

  const threadId = 'demo-thread-42'
  const config = { configurable: { thread_id: threadId } }

  // Run 1
  console.log('👤 User: Hello!')
  const step1 = await app.invoke({ input: 'Hello!' }, config)
  console.log('🤖:', step1.response)

  // Simulate restart → Run again
  console.log('\n🔁 Simulating resume (same thread)...\n')
  const step2 = await app.invoke({ input: 'What did I say before?' }, config)
  console.log('🤖:', step2.response)
}

main().catch(console.error)

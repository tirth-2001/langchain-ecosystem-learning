/**
 * Stage 7 – LangGraph Fundamentals: Multi-Node Workflow
 * Micro-project: Chaining multiple nodes sequentially
 *
 * Objectives:
 * 1. Create a multi-step workflow (Generation -> Formatting)
 * 2. Pass data between nodes using the shared state
 * 3. Demonstrate how downstream nodes consume upstream outputs
 *
 * Core Concepts Covered:
 * - Sequential Edges: Connecting Node A -> Node B
 * - State Flow: How state evolves through the graph
 * - Separation of Concerns: Splitting logic into distinct nodes
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import 'dotenv/config'

/**
 * 1️⃣ Define State Annotation
 */
const StateAnnotation = Annotation.Root({
  query: Annotation<string>({
    reducer: (current, update) => update,
  }),
  rawAnswer: Annotation<string>({
    reducer: (current, update) => update,
  }),
  formattedAnswer: Annotation<string>({
    reducer: (current, update) => update,
  }),
})

/**
 * 2️⃣ Node 1 → LLM Node
 * Takes query → returns rawAnswer
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.3,
})

const llmPrompt = ChatPromptTemplate.fromTemplate(`Answer briefly and informatively:\n\nQuestion: {query}`)

const llmChain = RunnableSequence.from([llmPrompt, model, (output) => ({ rawAnswer: output.content })])

async function llmNode(state: typeof StateAnnotation.State) {
  const result = await llmChain.invoke({ query: state.query })
  return { rawAnswer: result.rawAnswer }
}

/**
 * 3️⃣ Node 2 → Formatter Node
 * Takes rawAnswer → formattedAnswer
 */
async function formatterNode(state: typeof StateAnnotation.State) {
  const text = state.rawAnswer.trim()

  // Example: Add markdown + clean formatting
  const formatted = `### 🤖 AI Response\n${text[0].toLowerCase() + text.slice(1)}.`

  return { formattedAnswer: formatted }
}

/**
 * 4️⃣ Build Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('generate', llmNode)
  .addNode('format', formatterNode)
  .addEdge('__start__', 'generate') // Entry point
  .addEdge('generate', 'format') // Chain nodes
  .addEdge('format', END) // End node

const app = workflow.compile()

/**
 * 5️⃣ Run the graph
 */
async function main() {
  const input = { query: 'What are the benefits of drinking ginger masala tea with milk?' }
  const result = await app.invoke(input)

  console.log('\n✅ Final State:')
  console.log(result)

  console.log('\n💬 Formatted Output:\n', result.formattedAnswer)
}

main()

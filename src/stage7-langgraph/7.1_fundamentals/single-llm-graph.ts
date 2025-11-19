/**
 * Stage 7 – LangGraph Fundamentals: Single LLM Node
 * Micro-project: Integrating an LLM into a graph node
 *
 * Objectives:
 * 1. Create a graph with a single node that calls an LLM
 * 2. Use RunnableSequence to structure the LLM call
 * 3. Map LLM output back to the graph state
 *
 * Core Concepts Covered:
 * - ChatOpenAI: Using an LLM within a node
 * - RunnableSequence: Composing prompt and model
 * - State Mapping: Extracting content from LLM response to state
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 1️⃣ Define State Annotation
 */
const StateAnnotation = Annotation.Root({
  query: Annotation<string>({ reducer: (_current: string, update: string) => update }), // input
  answer: Annotation<string>({ reducer: (_current: string, update: string) => update }), // output
})

/**
 * 2️⃣ Build a simple LLM Runnable (LangChain chain)
 * RunnableSequence = prompt → model → output mapping
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini', // efficient, low-cost
  temperature: 0.3,
})

const prompt = ChatPromptTemplate.fromTemplate(`Answer the user's question clearly and concisely:\n\nQuestion: {query}`)

const chain = RunnableSequence.from([
  prompt,
  model,
  // Map model output → graph state key "answer"
  (response) => ({
    answer: response.content,
  }),
])

/**
 * 3️⃣ Define the LLM Node
 */
async function llmNode(state: typeof StateAnnotation.State) {
  const result = await chain.invoke({ query: state.query })
  return { answer: result.answer }
}

/**
 * 4️⃣ Create the Graph
 */
const graph = new StateGraph(StateAnnotation)
  .addNode('llmResponder', llmNode)
  .addEdge('__start__', 'llmResponder')
  .addEdge('llmResponder', END)

const app = graph.compile()

/**
 * 5️⃣ Run it
 */
async function main() {
  const input = { query: "What's the capital of Gujarat?" }
  const result = await app.invoke(input)
  console.log('✅ Final State:', result)
}

main()

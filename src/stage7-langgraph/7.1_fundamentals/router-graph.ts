/**
 * Stage 7 – LangGraph Fundamentals: Router Node Pattern
 * Micro-project: Classification-based workflow routing
 *
 * Objectives:
 * 1. Create a dedicated "Router" node to classify user intent
 * 2. Route execution to different specialized nodes based on classification
 * 3. Handle different types of tasks (General Q&A vs Math)
 *
 * Core Concepts Covered:
 * - Router Node: A node solely responsible for decision making
 * - Conditional Edges: Mapping router output to graph branches
 * - Specialized Workers: Nodes focused on specific tasks
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 1️⃣ Define State
 */
const StateAnnotation = Annotation.Root({
  query: Annotation<string>(),
  route: Annotation<string>(),
  result: Annotation<string>(),
})

/**
 * 2️⃣ Router Node
 * Classifies input type: "general" or "math"
 */
const routerPrompt = ChatPromptTemplate.fromTemplate(`
Classify the user's question into one of two categories: "general" or "math".
Respond with only one word: general OR math.

Question: {query}
`)

const routerModel = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })
const routerChain = RunnableSequence.from([routerPrompt, routerModel, (out) => out.content.trim().toLowerCase()])

async function routerNode(state: typeof StateAnnotation.State) {
  const route = await routerChain.invoke({ query: state.query })
  console.log('🧭 Routing to:', route)
  return { route }
}

/**
 * 3️⃣ Answer Node (general)
 */
const answerPrompt = ChatPromptTemplate.fromTemplate(`Answer briefly and clearly:\n\n{query}`)
const answerModel = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.5 })
const answerChain = RunnableSequence.from([answerPrompt, answerModel, (output) => ({ result: output.content })])

async function answerNode(state: typeof StateAnnotation.State) {
  return await answerChain.invoke({ query: state.query })
}

/**
 * 4️⃣ Calculator Node (math)
 */
async function calculatorNode(state: typeof StateAnnotation.State) {
  try {
    // naive numeric eval (for demo)
    const expression = state.query.replace(/[^\d+\-*/().]/g, '')
    // eslint-disable-next-line no-eval
    const result = eval(expression)
    return { result: `🧮 The result is ${result}` }
  } catch {
    return { result: '❌ Invalid math expression.' }
  }
}

/**
 * 5️⃣ Build Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('router', routerNode)
  .addNode('answerer', answerNode)
  .addNode('calculator', calculatorNode)
  .addEdge('__start__', 'router')
  .addConditionalEdges('router', (state) => state.route, {
    general: 'answerer',
    math: 'calculator',
  })
  .addEdge('answerer', END)
  .addEdge('calculator', END)

const app = workflow.compile()

/**
 * 6️⃣ Run Example
 */
async function main() {
  const cases = ['Who discovered gravity in ancient times as per Indian mythology?', 'What is 25 * 6?']

  for (const q of cases) {
    console.log(`\n💬 User: ${q}`)
    const output = await app.invoke({ query: q })
    console.log('🤖 Response:', output.result)
  }
}

main()

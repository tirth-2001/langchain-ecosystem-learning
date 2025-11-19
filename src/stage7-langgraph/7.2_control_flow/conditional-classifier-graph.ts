/**
 * Stage 7 – LangGraph Control Flow: Conditional Classification
 * Micro-project: Routing based on LLM classification
 *
 * Objectives:
 * 1. Use an LLM to classify user intent (Search vs Respond)
 * 2. Dynamically route the workflow based on the classification result
 * 3. Implement specialized paths for different types of queries
 *
 * Core Concepts Covered:
 * - Classifier Pattern: Using an LLM to decide the control flow
 * - Conditional Edges: Routing logic based on state values
 * - Specialized Nodes: Distinct handlers for different intents
 */

import { StateGraph, Annotation, END, START } from '@langchain/langgraph'
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
  answer: Annotation<string>(),
})

/**
 * 2️⃣ Define Model
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
})

/**
 * 3️⃣ Classifier Node
 */
const classifierPrompt = ChatPromptTemplate.fromTemplate(`
You are a routing assistant.
Classify the user's request into one of the following types:
- "search" if the question needs external or factual lookup
- "respond" if it can be answered directly from general knowledge.

User query: {query}

Reply only with one word: search or respond.
`)

const classifierChain = RunnableSequence.from([
  classifierPrompt,
  model,
  (output) => output.content.trim().toLowerCase(),
])

async function classifierNode(state: typeof StateAnnotation.State) {
  const route = await classifierChain.invoke({ query: state.query })
  console.log('🧭 Classifier route:', route)
  return { route }
}

/**
 * 4️⃣ Search Node
 */
async function searchNode(state: typeof StateAnnotation.State) {
  console.log('🔍 Performing pseudo-search...')
  const fakeSearchResult = `Search result: Latest info for "${state.query}".`
  return { answer: fakeSearchResult }
}

/**
 * 5️⃣ Respond Node
 */
const responsePrompt = ChatPromptTemplate.fromTemplate(`
Answer the user's question concisely:
{query}
`)

const responseChain = RunnableSequence.from([responsePrompt, model, (output) => output.content.trim()])

async function respondNode(state: typeof StateAnnotation.State) {
  const response = await responseChain.invoke({ query: state.query })
  return { answer: response }
}

/**
 * 6️⃣ Build Graph with Conditional Edge
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('classifier', classifierNode)
  .addNode('search', searchNode)
  .addNode('respond', respondNode)
  .addEdge(START, 'classifier')
  .addConditionalEdges(
    'classifier',
    (state) => {
      if (state.route === 'search') return 'search'
      return 'respond'
    },
    {
      search: 'search',
      respond: 'respond',
    },
  )
  .addEdge('search', END)
  .addEdge('respond', END)

const app = workflow.compile()

/**
 * 7️⃣ Run Example
 */
async function main() {
  console.log('🧩 Conditional Routing Graph Demo\n')

  const testQueries = ['What is the capital of New Zealand?', 'Tell me a motivational quote.']

  for (const query of testQueries) {
    console.log('='.repeat(60))
    console.log('📝 Query:', query)
    const result = await app.invoke({ query })
    console.log('✅ Final Output:', result)
  }
}

main()

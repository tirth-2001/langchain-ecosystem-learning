import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import 'dotenv/config'

/**
 * 1️⃣ State Definition
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  summary: Annotation<string>(),
  chatHistory: Annotation<string[]>({
    reducer: (curr, next) => [...(curr ?? []), ...(next ?? [])],
  }),
  retrievedDocs: Annotation<string[]>({
    reducer: (curr, next) => next ?? curr,
  }),
  response: Annotation<string>(),
})

/**
 * 2️⃣ Models & Stores
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.4,
})

const documents = [
  'RAG stands for Retrieval-Augmented Generation.',
  'LangGraph allows building graph-based workflows for LLMs.',
  'Memory nodes maintain stateful conversation context.',
  'Vector stores such as FAISS or Chroma store text embeddings for retrieval.',
]

const embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
let retriever: ReturnType<typeof MemoryVectorStore.prototype.asRetriever>
;(async () => {
  const vectorStore = await MemoryVectorStore.fromTexts(documents, {}, embeddings)
  retriever = vectorStore.asRetriever(2)
})()

/**
 * 3️⃣ Retrieval Node
 */
async function retrievalNode(state: typeof StateAnnotation.State) {
  if (!retriever) {
    throw new Error('Retriever not initialized')
  }
  console.log('🔍 Retrieving relevant docs...')
  const results = await retriever._getRelevantDocuments(state.input)
  const retrievedDocs = results.map((d) => d.pageContent)
  console.log('📄 Retrieved Docs:', retrievedDocs)
  return { retrievedDocs }
}

/**
 * 4️⃣ RAG Chain
 */
const ragPrompt = ChatPromptTemplate.fromTemplate(`
You are a helpful assistant.
Use both retrieved knowledge and conversation memory to answer accurately.

Summary Memory:
{summary}

Recent Chat:
{chatHistory}

Retrieved Knowledge:
{retrievedDocs}

User Question:
{input}
`)

const ragChain = RunnableSequence.from([ragPrompt, model, (out) => out.content.trim()])

async function llmNode(state: typeof StateAnnotation.State) {
  console.log('💬 Generating contextual answer...')
  const response = await ragChain.invoke({
    input: state.input,
    summary: state.summary || 'None yet.',
    chatHistory: (state.chatHistory ?? []).join('\n'),
    retrievedDocs: (state.retrievedDocs ?? []).join('\n'),
  })
  return { response }
}

/**
 * 5️⃣ Memory Nodes
 */
async function memoryInputNode(state: typeof StateAnnotation.State) {
  return { chatHistory: [`Human: ${state.input}`] }
}

async function memoryOutputNode(state: typeof StateAnnotation.State) {
  return { chatHistory: [`AI: ${state.response}`] }
}

/**
 * 6️⃣ Graph Construction
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('memoryInput', memoryInputNode)
  .addNode('retrievalNode', retrievalNode)
  .addNode('llmNode', llmNode)
  .addNode('memoryOutput', memoryOutputNode)
  .addEdge(START, 'memoryInput')
  .addEdge('memoryInput', 'retrievalNode')
  .addEdge('retrievalNode', 'llmNode')
  .addEdge('llmNode', 'memoryOutput')
  .addEdge('memoryOutput', END)

const app = workflow.compile()

/**
 * 7️⃣ Demo Run
 */
async function main() {
  console.log('\n=== 7.3.3 — Retrieval-Augmented Graph ===\n')

  let state = { summary: '', chatHistory: [] }

  const input = 'What does RAG mean, and how does LangGraph relate to it?'
  console.log('\n👤 User:', input)
  const output = await app.invoke({ ...state, input })

  console.log('\n🤖 AI Response:\n', output.response)
}

main().catch(console.error)

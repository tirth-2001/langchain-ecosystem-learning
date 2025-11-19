/**
 * Stage 7 – LangGraph Memory: Basic Conversation History
 * Micro-project: Implementing standard chat memory
 *
 * Objectives:
 * 1. Create a graph that retains conversation history within a single run
 * 2. Use a reducer to append new messages to the history array
 * 3. Inject the history into the LLM prompt for context-aware responses
 *
 * Core Concepts Covered:
 * - State Reducers: Accumulating data (appending to arrays)
 * - Context Injection: Passing history to the LLM
 * - Memory Nodes: Explicit nodes for managing state updates
 */

import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 1️⃣ State model with reducer-based memory
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  chatHistory: Annotation<string[]>({
    reducer: (curr, next) => [...(curr ?? []), ...(next ?? [])],
  }),
  response: Annotation<string>(),
})

/**
 * 2️⃣ LLM setup
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.5,
})

const chatPrompt = ChatPromptTemplate.fromTemplate(`
You are a helpful assistant. Use conversation history to reply naturally.

Chat history:
{chatHistory}

User: {input}
AI:
`)

const chatChain = RunnableSequence.from([chatPrompt, model, (out) => out.content.trim()])

/**
 * 3️⃣ Nodes
 */
async function memoryNodeInput(state: typeof StateAnnotation.State) {
  console.log('🧠 Adding user input to memory...')
  return { chatHistory: [`Human: ${state.input}`] }
}

async function llmNode(state: typeof StateAnnotation.State) {
  console.log('💬 Generating reply...')
  const historyText = (state.chatHistory ?? []).join('\n')
  const response = await chatChain.invoke({
    input: state.input,
    chatHistory: historyText,
  })
  return { response }
}

async function memoryNodeOutput(state: typeof StateAnnotation.State) {
  console.log('🧠 Adding assistant reply to memory...')
  return { chatHistory: [`AI: ${state.response}`] }
}

/**
 * 4️⃣ Graph structure
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('memoryInput', memoryNodeInput)
  .addNode('llm', llmNode)
  .addNode('memoryOutput', memoryNodeOutput)
  .addEdge(START, 'memoryInput')
  .addEdge('memoryInput', 'llm')
  .addEdge('llm', 'memoryOutput')
  .addEdge('memoryOutput', END)

const app = workflow.compile()

/**
 * 5️⃣ Demo
 */
async function runChatDemo() {
  console.log('\n=== 7.3.1 — Graph Memory Basics ===\n')

  const input1 = 'Hi there!'
  const first = await app.invoke({ input: input1 })
  console.log('\n🤖 Response 1:', first.response)

  const input2 = 'Remember my previous message and tell me what I said.'
  const second = await app.invoke({
    input: input2,
    chatHistory: first.chatHistory,
  })
  console.log('\n🤖 Response 2:', second.response)

  console.log('\n🧠 Final chat history:\n', second.chatHistory.join('\n'))
}

runChatDemo().catch(console.error)

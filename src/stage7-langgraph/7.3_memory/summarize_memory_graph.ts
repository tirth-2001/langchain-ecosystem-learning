/**
 * Stage 7 – LangGraph Memory: Summarization Strategy
 * Micro-project: Managing long conversations with periodic summarization
 *
 * Objectives:
 * 1. Implement a strategy to handle long context windows
 * 2. Create a summarizer node that condenses history when it gets too long
 * 3. Maintain a "running summary" while clearing raw message history
 *
 * Core Concepts Covered:
 * - Context Management: Optimizing token usage
 * - Summarization Node: A specialized node for compressing state
 * - State Reset: Clearing arrays while preserving distilled information
 */

import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 1️⃣ State model
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  chatHistory: Annotation<string[]>({
    reducer: (curr, next) => [...(curr ?? []), ...(next ?? [])],
  }),
  summary: Annotation<string>({
    reducer: (curr, next) => next ?? curr,
  }),
  response: Annotation<string>(),
})

/**
 * 2️⃣ Models
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.5,
})

/**
 * 3️⃣ Chat chain
 */
const chatPrompt = ChatPromptTemplate.fromTemplate(`
You are a helpful assistant.
Use the provided summary (long-term memory) and recent chat history.

Summary memory:
{summary}

Recent chat history:
{chatHistory}

User: {input}
AI:
`)

const chatChain = RunnableSequence.from([chatPrompt, model, (out) => out.content.trim()])

/**
 * 4️⃣ Summarizer chain
 */
const summarizerPrompt = ChatPromptTemplate.fromTemplate(`
Summarize the following chat into a concise paragraph that preserves facts and tone.

Previous summary:
{summary}

Recent conversation:
{chatHistory}

Return only the updated summary.
`)

const summarizeChain = RunnableSequence.from([summarizerPrompt, model, (out) => out.content.trim()])

/**
 * 5️⃣ Nodes
 */
async function memoryInputNode(state: typeof StateAnnotation.State) {
  console.log('🧠 Adding user input to chat history...')
  return { chatHistory: [`Human: ${state.input}`] }
}

async function llmNode(state: typeof StateAnnotation.State) {
  console.log('💬 Generating reply using summary + history...')
  const historyText = (state.chatHistory ?? []).join('\n')
  const response = await chatChain.invoke({
    input: state.input,
    chatHistory: historyText,
    summary: state.summary || 'None yet.',
  })
  return { response }
}

async function memoryOutputNode(state: typeof StateAnnotation.State) {
  console.log('🧠 Adding AI reply to chat history...')
  return { chatHistory: [`AI: ${state.response}`] }
}

async function summaryNode(state: typeof StateAnnotation.State) {
  const history = state.chatHistory ?? []
  if (history.length < 4) {
    return {} // skip summarization if few turns
  }

  console.log('🧾 Summarizing long chat history...')

  const newSummary = await summarizeChain.invoke({
    summary: state.summary || 'None yet.',
    chatHistory: history.join('\n'),
  })

  console.log('📘 Summary updated:\n', newSummary)

  // reset short-term buffer
  return {
    summary: newSummary,
    chatHistory: [],
  }
}

/**
 * 6️⃣ Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('memoryInput', memoryInputNode)
  .addNode('llm', llmNode)
  .addNode('memoryOutput', memoryOutputNode)
  .addNode('summaryNode', summaryNode)
  .addEdge(START, 'memoryInput')
  .addEdge('memoryInput', 'llm')
  .addEdge('llm', 'memoryOutput')
  .addEdge('memoryOutput', 'summaryNode')
  .addEdge('summaryNode', END)

const app = workflow.compile()

/**
 * 7️⃣ Demo
 */
async function main() {
  console.log('\n=== 7.3.2 — Summary Memory Graph ===\n')

  let state: Partial<typeof StateAnnotation.State> = { summary: '', chatHistory: [] as string[] }

  const turns = [
    'Hey there! I work as a chef.',
    'I love making Italian food, especially pasta.',
    'Can you suggest a dessert that pairs well with pasta?',
    'Also, remind me what I told you about my job earlier.',
  ]

  for (const input of turns) {
    console.log('\n👤 User:', input)
    state = await app.invoke({ ...state, input })
    console.log('🤖 AI:', state.response)
  }

  console.log('\n🧠 Final Summary:\n', state.summary)
}

main().catch(console.error)

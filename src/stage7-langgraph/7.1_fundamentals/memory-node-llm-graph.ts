/**
 * Stage 7 – LangGraph Fundamentals: Memory Management
 * Micro-project: Building a graph with persistent chat history
 *
 * Objectives:
 * 1. Implement a memory node to manage conversation history
 * 2. Use reducers to append new messages to the state
 * 3. Create a context-aware LLM node that uses the history
 *
 * Core Concepts Covered:
 * - Reducers: Merging new data into existing state arrays
 * - Chat History: Persisting conversation context across turns
 * - MessagesPlaceholder: Injecting history into prompts
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import type { BaseMessage } from '@langchain/core/messages'
import 'dotenv/config'

/**
 * 1️⃣ Define State Annotations
 */
const StateAnnotation = Annotation.Root({
  userInput: Annotation<string>({ reducer: (current, update) => update }),
  chatHistory: Annotation<BaseMessage[]>({
    // merge previous messages with new ones
    reducer: (current = [], update = []) => {
      console.log('chatHistory reducer', { current, update })
      return [...current, ...update]
    },
  }),
  answer: Annotation<string>({ reducer: (current, update) => update }),
})

/**
 * 2️⃣ Memory Node — manages message history
 */
import { HumanMessage, AIMessage } from '@langchain/core/messages'

async function memoryNode(state: typeof StateAnnotation.State) {
  // Only add the new userInput to chatHistory (reducer will append it to existing)
  // Don't include old answer here - llmNode will add it after generating response
  return { chatHistory: [new HumanMessage(state.userInput)] }
}

/**
 * 3️⃣ LLM Node — context-aware chat generation
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.3,
})

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful AI that remembers prior context.'],
  new MessagesPlaceholder('chatHistory'), // pull memory into context
  ['human', '{userInput}'],
])

const chain = RunnableSequence.from([prompt, model, (output) => ({ answer: output.content })])

async function llmNode(state: typeof StateAnnotation.State) {
  const result = await chain.invoke({
    userInput: state.userInput,
    chatHistory: state.chatHistory,
  })
  // Add the AI's answer to chatHistory so it's preserved for next run
  return {
    answer: result.answer,
    chatHistory: [new AIMessage(result.answer)],
  }
}

/**
 * 4️⃣ Build the Graph
 */
const graph = new StateGraph(StateAnnotation)
  .addNode('memory', memoryNode)
  .addNode('llmResponder', llmNode)
  .addEdge('__start__', 'memory')
  .addEdge('memory', 'llmResponder')
  .addEdge('llmResponder', END)

const app = graph.compile()

/**
 * 5️⃣ Run Multiple Times to Simulate Persistent Memory
 */
async function main() {
  const input = { userInput: 'Hello! I live in New Zealand.' }
  const result1 = await app.invoke(input)
  console.log('\n🧠 Run 1:', result1)

  // Simulate new user input — graph retains context in chatHistory
  const newInput = { ...result1, userInput: 'where do I live?' }
  const result2 = await app.invoke(newInput)

  console.log('\n🧠 Run 2:', result2)
}

main()

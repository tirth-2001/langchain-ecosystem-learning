/**
 * Stage 2 – Core Modules: ConversationBufferWindowMemory Demo
 * Micro-project: Using ConversationBufferWindowMemory for sliding window chat memory
 *
 * Objectives:
 * 1. Demonstrate how to use ConversationBufferWindowMemory to retain only the last N exchanges in memory
 * 2. Show how this helps manage context size and avoid token overflow in long conversations
 * 3. Illustrate the trade-off between short-term memory and full buffer memory
 *
 * Core Concepts Covered:
 * - ConversationBufferWindowMemory: keeps only the most recent k turns of conversation
 * - Configuring window size (k) for memory
 * - Integrating windowed memory with ConversationChain and PromptTemplate
 * - Example of how context is lost for older turns
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { BufferWindowMemory } from 'langchain/memory'

async function runConversationWindowMemory() {
  // 1. LLM
  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

  // 2. Define Prompt Template
  const prompt = PromptTemplate.fromTemplate(`
  You are a helpful assistant.
  Conversation history (last 2 turns only):
  {history}
  
  Current question: {input}
  `)

  // 3. Memory with sliding window (keep last 2 exchanges)
  const memory = new BufferWindowMemory({
    k: 1, // keep last 1 turns
    memoryKey: 'history',
    returnMessages: true,
  })

  // 4. Chain
  const chain = new ConversationChain({
    llm,
    prompt,
    memory,
  })

  // 5. Simulate conversation
  console.log(await chain.invoke({ input: 'Hi, I’m Tirth.' }))
  console.log(await chain.invoke({ input: 'I live in India.' }))
  console.log(await chain.invoke({ input: 'I love coding in TypeScript.' }))
  console.log(await chain.invoke({ input: 'What is my strength in coding?' }))
  console.log(await chain.invoke({ input: 'What’s my name?' }))
}

runConversationWindowMemory()

/**
 * Stage 2 – Core Modules: ConversationTokenBufferMemory Demo
 * Micro-project: Token-limited chat memory for LLMs
 *
 * Objectives:
 * 1. Show how to use ConversationTokenBufferMemory to keep chat history under a token limit
 * 2. Demonstrate automatic pruning of oldest messages when token budget is exceeded
 * 3. Integrate with ConversationChain and PromptTemplate for a working example
 *
 * Core Concepts Covered:
 * - Token-based memory: keeps as much history as fits in maxTokenLimit
 * - Automatic context management for LLMs
 * - Practical usage in a conversation chain
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { ConversationTokenBufferMemory } from 'langchain/memory'

// 1. LLM
const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

// 2. Prompt Template
const prompt = PromptTemplate.fromTemplate(`
You are a helpful assistant.
Conversation so far (trimmed by token limit):
{history}

Current question: {input}
`)

// 3. Memory (limit tokens instead of turns)
const memory = new ConversationTokenBufferMemory({
  llm,
  maxTokenLimit: 50, // keep history under 50 tokens
  memoryKey: 'history',
  returnMessages: true,
})

// 4. Chain
const chain = new ConversationChain({
  llm,
  prompt,
  memory,
})

async function runConversationTokenBuffer() {
  // 5. Simulate conversation
  await chain.invoke({ input: 'Hi, I’m Tirth.' })
  console.log('After Turn 1:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'I live in India.' })
  console.log('After Turn 2:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'I love coding in TypeScript.' })
  console.log('After Turn 3:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'What’s my name?' })
  console.log('After Turn 4:', await memory.loadMemoryVariables({}))
}

runConversationTokenBuffer()

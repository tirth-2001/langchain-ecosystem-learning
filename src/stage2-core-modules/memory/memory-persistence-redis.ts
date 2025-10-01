/**
 * Stage 2 – Core Modules: Redis Memory Persistence Demo
 * Micro-project: Persisting conversation memory to Redis
 *
 * Objectives:
 * 1. Demonstrate how to persist chat memory using a Redis backend
 * 2. Show how to load memory on startup and save after each session
 * 3. Integrate Redis-based memory with ConversationChain and BufferMemory
 *
 * Core Concepts Covered:
 * - Redis-based persistence: saving and loading memory from a Redis server
 * - BufferMemory: stores all conversation history
 * - Practical usage in a conversation chain with Redis persistence
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { BufferMemory } from 'langchain/memory'
import { createClient } from 'redis'
import { RedisChatMessageHistory } from '@langchain/redis'

async function run() {
  // 1. Connect to Redis
  const redisClient = createClient({ url: 'redis://localhost:6379' })
  await redisClient.connect()

  // 2. Setup Redis-backed chat history
  const chatHistory = new RedisChatMessageHistory({
    sessionId: 'user-123', // unique per user/session
    client: redisClient,
  })

  // 3. Create memory with Redis history
  const memory = new BufferMemory({
    chatHistory,
    returnMessages: true,
  })

  // 4. Setup LLM + chain
  const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })
  const chain = new ConversationChain({ llm: model, memory })

  // 5. Run interactions
  console.log('\n---- Chat 1 ----')
  let res = await chain.invoke({ input: 'Hello, my name is Tirth.' })
  console.log(res.response)

  console.log('\n---- Chat 2 ----')
  res = await chain.invoke({ input: "What's my name?" })
  console.log(res.response)

  // 6. End session
  await redisClient.quit()
}

run()

/**
 * Stage 2 – Core Modules: JSON Memory Persistence Demo
 * Micro-project: Persisting conversation memory to a JSON file
 *
 * Objectives:
 * 1. Demonstrate how to persist chat memory using a local JSON file
 * 2. Show how to load memory on startup and save after each session
 * 3. Integrate file-based memory with ConversationChain and BufferMemory
 *
 * Core Concepts Covered:
 * - File-based persistence: saving and loading memory from disk
 * - BufferMemory: stores all conversation history
 * - Practical usage in a conversation chain with persistence
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { ConversationChain } from 'langchain/chains'
import { ChatOpenAI } from '@langchain/openai'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'

const MEMORY_DIR = path.resolve(__dirname, 'persisted-memory')
const MEMORY_FILE = path.join(MEMORY_DIR, 'chat-memory.json')

// Load persisted memory
function loadMemory() {
  try {
    if (!fs.existsSync(MEMORY_FILE)) {
      return { history: [] }
    }

    const fileContents = fs.readFileSync(MEMORY_FILE, 'utf8')
    if (!fileContents || fileContents.trim().length === 0) {
      return { history: [] }
    }

    return JSON.parse(fileContents)
  } catch {
    return { history: [] }
  }
}

// Save memory to file
function saveMemory(memoryData: any) {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true })
  }
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryData, null, 2))
}

async function run() {
  const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

  console.log('Loading memory...')
  const persisted = loadMemory()
  console.log('Chat history:', persisted.history)

  // Create ChatMessageHistory instance and preload past messages
  const chatHistory = new ChatMessageHistory()
  for (const message of persisted.history) {
    // Each message has { type: "human"/"ai", content: "..." }
    await chatHistory.addMessage(message)
  }

  const memory = new BufferMemory({
    returnMessages: true,
    chatHistory,
  })

  const chain = new ConversationChain({ llm, memory })

  // Interaction 1
  const res1 = await chain.invoke({ input: "Hi, I'm Alex." })
  console.log('Bot:', res1.response)

  // // Interaction 2
  const res2 = await chain.invoke({ input: "What's my name?" })
  console.log('Bot:', res2.response)

  // Persist memory after session
  saveMemory(await memory.loadMemoryVariables({}))
}

run()

/**
 * Stage 2 – Core Modules: ConversationSummaryMemory Demo
 * Micro-project: Summarizing chat memory for LLMs
 *
 * Objectives:
 * 1. Show how to use ConversationSummaryMemory to keep a running summary of chat history
 * 2. Demonstrate automatic summarization of older messages as conversation grows
 * 3. Integrate with ConversationChain and PromptTemplate for a working example
 *
 * Core Concepts Covered:
 * - Summary-based memory: compresses conversation history into a summary using an LLM
 * - Efficient context management for long conversations
 * - Practical usage in a conversation chain
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { ConversationSummaryMemory } from 'langchain/memory'

// 1. LLM
const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

// 2. Prompt Template
const prompt = PromptTemplate.fromTemplate(`
You are a helpful assistant.
Conversation summary so far:
{history}

Current question: {input}
`)

// 3. Memory (summarizes conversation instead of storing full)
const memory = new ConversationSummaryMemory({
  llm,
  memoryKey: 'history',
  returnMessages: true,
})

// 4. Chain
const chain = new ConversationChain({
  llm,
  prompt,
  memory,
})

async function runConversationSummaryMemory() {
  // 5. Simulate conversation
  await chain.invoke({ input: 'Hi, I’m Tirth, I work as a software engineer.' })
  console.log('After Turn 1:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'I love coding in TypeScript and exploring GenAI.' })
  console.log('After Turn 2:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'I’m currently working on LangChain learning roadmap.' })
  console.log('After Turn 3:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'What do you know about me so far?' })
  console.log('After Turn 4:', await memory.loadMemoryVariables({}))
}

runConversationSummaryMemory()

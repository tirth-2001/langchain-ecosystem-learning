/**
 * Stage 2 – Core Modules: CombinedMemory Demo
 * Micro-project: Combining summary and window memory for LLMs
 *
 * Objectives:
 * 1. Show how to use CombinedMemory to merge ConversationSummaryMemory (long-term) and BufferWindowMemory (short-term)
 * 2. Demonstrate how both recent and summarized context can be injected into the prompt
 * 3. Integrate with ConversationChain and PromptTemplate for a working example
 *
 * Core Concepts Covered:
 * - CombinedMemory: merges multiple memory strategies for scalable, efficient context
 * - ConversationSummaryMemory: compresses long-term chat history into a summary
 * - BufferWindowMemory: keeps only the most recent k turns for short-term recall
 * - Practical usage in a conversation chain
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { ConversationSummaryMemory } from 'langchain/memory'
import { BufferWindowMemory } from 'langchain/memory'
import { CombinedMemory } from 'langchain/memory'
import { PromptTemplate } from '@langchain/core/prompts'

const llm = new ChatOpenAI({
  model: 'gpt-4.1-mini',
  temperature: 0,
})

// 1. Long-term memory (summary)
const summaryMemory = new ConversationSummaryMemory({
  llm,
  memoryKey: 'summary',
  inputKey: 'input',
  returnMessages: true,
})

// 2. Short-term memory (window of last 2 exchanges)
const windowMemory = new BufferWindowMemory({
  k: 2,
  memoryKey: 'recent_history',
  inputKey: 'input',
  returnMessages: true,
})

// 3. Combine them
const combinedMemory = new CombinedMemory({
  memories: [summaryMemory, windowMemory],
  inputKey: 'input', // Tell CombinedMemory which key contains the user input
})

// 4. Use with ConversationChain
const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant. And you reply concise specific to the question asked.
Here is the summary of the conversation so far:
{summary}

Here are the recent messages:
{recent_history}

User: {input}
AI:
`)

const chain = new ConversationChain({
  llm,
  memory: combinedMemory,
  prompt,
})

async function runCombinedMemoryDemo() {
  // Demo
  await chain.call({ input: 'Hello, my name is Tirth.' })
  await chain.call({ input: 'I live in India and love coding.' })
  await chain.call({ input: 'I love having tea while coding and prefer for long drives to relax.' })
  await chain.call({ input: 'Dubai has tallest building in the world' })
  await chain.call({ input: 'What’s my name?' })
  await chain.call({ input: 'Where do I live?' })

  const final = await chain.call({ input: 'Can you summarize what you know about me?' })
  console.log('=== Final Answer ===')
  console.log(final.response)

  console.log('\n=== Memory State ===')
  console.log(await combinedMemory.loadMemoryVariables({}))
}

runCombinedMemoryDemo()

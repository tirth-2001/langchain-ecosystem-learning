/**
 * Stage 2 – Core Modules: EntityMemory Demo
 * Micro-project: Tracking and recalling entity facts in conversation
 *
 * Objectives:
 * 1. Show how to use EntityMemory to extract and store facts about entities (people, places, things)
 * 2. Demonstrate how entity knowledge is recalled and injected into LLM prompts
 * 3. Integrate with ConversationChain and PromptTemplate for a working example
 *
 * Core Concepts Covered:
 * - EntityMemory: specialized memory for tracking entity attributes across a chat
 * - Fact extraction: LLM identifies and stores facts about entities as conversation progresses
 * - Prompt integration: entity knowledge is used to improve LLM responses
 * - Practical usage in a conversation chain
 */

import 'dotenv/config'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { EntityMemory } from 'langchain/memory'

// 1. LLM
const llm = new ChatOpenAI({
  temperature: 0,
  model: 'gpt-4.1-mini',
})

// 2. Memory
const memory = new EntityMemory({
  llm,
  returnMessages: true, // so history comes as structured messages
  inputKey: 'input',
})

// 3. Prompt
const template = `You are a helpful assistant.
Use facts about entities whenever possible.

Conversation so far:
{history}
User: {input}
AI:`

const prompt = PromptTemplate.fromTemplate(template)

// 4. Chain
const chain = new ConversationChain({
  llm,
  memory,
  prompt,
})

async function dumpEntities() {
  const entries = await Promise.all(
    memory.entityCache.map(async (key) => {
      const value = await memory.entityStore.get(key, '')
      return [key, value] as const
    }),
  )
  return Object.fromEntries(entries.filter(([, v]) => v && v !== ''))
}

async function run() {
  // === DEMO START ===

  console.log('\n--- First Input ---')
  let res = await chain.call({
    input: 'Alice likes pizza and lives in Paris.',
  })
  console.log('AI Response:', res.response)

  console.log('\n--- Memory Variables ---')
  console.log(await memory.loadMemoryVariables({}))

  console.log('\n--- Entity Store ---')
  console.log(await dumpEntities())

  console.log('\n--- Second Input ---')
  res = await chain.call({
    input: 'What does Alice like?',
  })
  console.log('AI Response:', res.response)

  console.log('\n--- Memory Variables ---')
  console.log(await memory.loadMemoryVariables({}))

  console.log('\n--- Entity Store ---')
  console.log(await dumpEntities())

  console.log('\n--- Third Input ---')
  res = await chain.call({
    input: 'Where does Alice live?',
  })
  console.log('AI Response:', res.response)

  console.log('\n--- Memory Variables ---')
  console.log(await memory.loadMemoryVariables({}))

  console.log('\n--- Entity Store ---')
  console.log(await dumpEntities())

  console.log('\n--- Fourth Input (new entity) ---')
  res = await chain.call({
    input: 'Bob is a doctor and plays guitar.',
  })
  console.log('AI Response:', res.response)

  console.log('\n--- Memory Variables ---')
  console.log(await memory.loadMemoryVariables({}))

  console.log('\n--- Entity Store ---')
  console.log(await dumpEntities())

  console.log('\n--- Fifth Input (query about Bob) ---')
  res = await chain.call({
    input: 'What does Bob do?',
  })
  console.log('AI Response:', res.response)

  console.log('\n--- Memory Variables ---')
  console.log(await memory.loadMemoryVariables({}))

  console.log('\n--- Entity Store ---')
  console.log(await dumpEntities())

  // === DEMO END ===
}

run()

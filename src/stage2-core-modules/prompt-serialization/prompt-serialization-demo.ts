/**
 * Stage 2 – Core Modules: Prompt Serialization Demo
 * Micro-project: Loading and using serialized prompts (JSON/YAML) with LangChain
 *
 * Objectives:
 * 1. Demonstrate loading prompt templates from external JSON and YAML files
 * 2. Show how to format and use these prompts with an LLM (OpenAI)
 * 3. Illustrate both single-turn (PromptTemplate) and multi-turn (ChatPromptTemplate) prompt serialization
 *
 * Core Concepts Covered:
 * - Prompt serialization: defining prompts in external files for maintainability and collaboration
 * - Loading prompts using LangChain's `load` function
 * - Formatting prompts with variables
 * - Passing formatted prompts/messages to an LLM and displaying results
 */

import 'dotenv/config'
import { load } from '@langchain/core/load'
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { readFileSync } from 'fs'

async function runSerializationDemo() {
  // Read and PARSE the JSON
  const promptJson = readFileSync('src/stage2-core-modules/prompt-serialization/templates/story-prompt.json', 'utf8')
  const promptObj = JSON.parse(promptJson) // Parse string to object

  // Load from the parsed object
  const prompt = (await load(JSON.stringify(promptObj))) as PromptTemplate // load expects a string, but properly formatted

  // 2. Create LLM
  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

  // 3. Format the prompt with variables
  const formatted = await prompt.invoke({ adjective: 'funny', content: 'a robot learning to cook' })
  console.log('Formatted Prompt:', formatted)

  // 4. Pass to LLM
  const result1 = await llm.invoke(formatted)
  console.log('LLM Output:', result1.content)

  console.log('====================================')

  const chatPromptJson = readFileSync(
    'src/stage2-core-modules/prompt-serialization/templates/chat-example.json',
    'utf8',
  )
  const chatPromptObj = JSON.parse(chatPromptJson) // Parse string to object

  // Load from the parsed object
  const chatPrompt = (await load(JSON.stringify(chatPromptObj))) as ChatPromptTemplate // load expects a string, but properly formatted

  const formattedChat = await chatPrompt.formatMessages({
    language: 'Spanish',
    topic: 'artificial intelligence',
  })

  console.log(formattedChat)
  // → [ { role: "system", content: "You are a helpful assistant who always replies in Spanish." },
  //     { role: "human", content: "Tell me about artificial intelligence." } ]

  const result2 = await llm.invoke(formattedChat)
  console.log('LLM Output:', result2.content)
}

runSerializationDemo().catch(console.error)

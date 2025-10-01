/**
 * Stage 2 – Core Modules: ChatPromptTemplate Demo
 * Micro-project: ChatPromptTemplate with Roles & Variables
 *
 * Objectives:
 * 1. Demonstrate usage of ChatPromptTemplate with system/human roles
 * 2. Show variable injection for dynamic prompts (e.g., language, text)
 * 3. Pipe prompt → LLM → output parser for a simple translation chain
 *
 * Core Concepts Covered:
 * - ChatPromptTemplate: role-based prompt construction
 * - Variable interpolation in prompts
 * - Chaining prompt, LLM, and output parser
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

// 1️⃣ Define ChatPromptTemplate
const chatPrompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant that always responds in a polite tone.'],
  ['human', 'Translate the following text into {language}: {text}'],
])

// 2️⃣ Build chain: Prompt → LLM → Parser
const chain = chatPrompt.pipe(new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })).pipe(new StringOutputParser())

// 3️⃣ Run demo
async function runDemo() {
  const result1 = await chain.invoke({
    language: 'French',
    text: 'Good morning, how are you?',
  })
  console.log('➡️ Translation to French:\n', result1)

  const result2 = await chain.invoke({
    language: 'Spanish',
    text: 'I am learning LangChain step by step.',
  })
  console.log('➡️ Translation to Spanish:\n', result2)
}

runDemo().catch(console.error)

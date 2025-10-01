/**
 * Stage 2 – Core Modules: MessagePromptTemplate Demo
 * Micro-project: MessagePromptTemplate with Roles & Variables
 *
 * Objectives:
 * 1. Demonstrate usage of individual MessagePromptTemplates (system, human, ai)
 * 2. Show variable injection for dynamic message construction (e.g., tone, question, previousAnswer)
 * 3. Pipe prompt → LLM → output parser for a multi-message conversation chain
 *
 * Core Concepts Covered:
 * - MessagePromptTemplate: granular message construction with roles
 * - Variable interpolation in message templates
 * - Combining messages into a ChatPromptTemplate
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  AIMessagePromptTemplate,
} from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

// 1️⃣ Create individual message templates
const systemMessage = SystemMessagePromptTemplate.fromTemplate(
  'You are a helpful assistant that provides {tone} answers.',
)

const humanMessage = HumanMessagePromptTemplate.fromTemplate('Please answer the following question: {question}')

const aiMessage = AIMessagePromptTemplate.fromTemplate('Here is my prior answer: {previousAnswer}')

// 2️⃣ Combine into ChatPromptTemplate
const chatPrompt = ChatPromptTemplate.fromMessages([systemMessage, humanMessage, aiMessage])

// 3️⃣ Build chain: Prompt → LLM → Parser
const chain = chatPrompt.pipe(new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })).pipe(new StringOutputParser())

// 4️⃣ Run demo
async function runDemo() {
  const response = await chain.invoke({
    tone: 'concise',
    question: 'Can you give me list of prime numbers excluding the ones that are already provided?',
    previousAnswer: 'Last time, provided prime numbers till 43',
  })

  console.log('➡️ Final Answer:\n', response)
}

runDemo().catch(console.error)

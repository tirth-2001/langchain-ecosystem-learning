/**
 * Stage 1 – Foundations & Core Building Blocks
 * Micro-project: Hello LangChain
 *
 * Objectives:
 * 1. Wrap OpenAI API using LangChain
 * 2. Compare raw OpenAI API usage vs LangChain
 * 3. Log tokens and response time
 *
 * Core Concepts Covered:
 * - LLM: Large Language Model abstraction
 * - PromptTemplate: reusable prompts with variables
 * - Chain: sequential processing of LLM calls
 * - Tools / Agents: basic idea for future stages
 */

// Load environment variables
import 'dotenv/config'

import { ChatOpenAI } from '@langchain/openai'
import { LLMChain } from 'langchain/chains'
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts'

// --------------------
// 1. Raw OpenAI API Usage
// --------------------
import OpenAIAPI from 'openai'
import { CallbackManager } from '@langchain/core/callbacks/manager'

async function rawOpenAIExample() {
  console.log('=== Raw OpenAI API Example ===')

  const client = new OpenAIAPI({ apiKey: process.env.OPENAI_API_KEY })
  const prompt = 'Write a short poem about AI learning in TypeScript.'

  const startTime = Date.now()
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  })
  const endTime = Date.now()

  // Raw OpenAI doesn’t directly return token usage here; we can check total_tokens
  const tokensUsed = response.usage?.total_tokens ?? 'N/A'

  console.log('Raw API Response:\n', response.choices[0].message.content)
  console.log('Tokens used:', tokensUsed)
  console.log('Time taken:', endTime - startTime, 'ms')
}

// --------------------
// 2. LangChain API Usage
// --------------------
async function langChainExample() {
  console.log('\n=== LangChain Example ===')

  // CallbackManager for tracking tokens
  const callbackManager = CallbackManager.fromHandlers({
    async handleLLMEnd(output) {
      const totalTokens = output.llmOutput?.tokenUsage?.totalTokens ?? 'N/A'
      console.log('LangChain total tokens used:', totalTokens)
    },
  })

  // 2.1 ChatOpenAI abstraction for chat models
  const llm = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
    callbacks: callbackManager,
  })

  // 2.2 PromptTemplate
  const prompt = ChatPromptTemplate.fromTemplate('Write a short poem about {topic}.')

  // 2.3 LLM piped with Prompt for Chain
  const chain = prompt.pipe(llm)

  const startTime = Date.now()
  const response = await chain.invoke({ topic: 'AI learning in TypeScript' })

  const endTime = Date.now()

  console.log('LangChain Response:\n', response.text)
  console.log('Time taken:', endTime - startTime, 'ms')
}

// --------------------
// Run both examples
// --------------------
async function main() {
  await rawOpenAIExample()
  await langChainExample()
}

main().catch((err) => console.error(err))

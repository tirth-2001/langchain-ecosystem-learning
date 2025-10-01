/**
 * src/stage2-core-modules/chains/text-transformer.ts
 *
 * Text Transformer Service:
 * - Take a text input → Rephrase → Summarize → Translate (to French) using SequentialChain.
 *
 */

import 'dotenv/config'

import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { LLMChain, SequentialChain } from 'langchain/chains'

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
})

// Step 1: Rephrase
const rephrasePrompt = PromptTemplate.fromTemplate('Rephrase the following text in simpler words:\n\n{text}')
const rephraseChain = new LLMChain({ llm, prompt: rephrasePrompt, outputKey: 'rephrased' })

// Step 2: Summarize
const summaryPrompt = PromptTemplate.fromTemplate('Summarize the following text in 2 sentences:\n\n{rephrased}')
const summaryChain = new LLMChain({ llm, prompt: summaryPrompt, outputKey: 'summary' })

// Step 3: Translate
const translatePrompt = PromptTemplate.fromTemplate('Translate the following summary into French:\n\n{summary}')
const translateChain = new LLMChain({ llm, prompt: translatePrompt, outputKey: 'french' })

// Combine all into SequentialChain
const overallChain = new SequentialChain({
  chains: [rephraseChain, summaryChain, translateChain],
  inputVariables: ['text'],
  outputVariables: ['rephrased', 'summary', 'french'],
})

async function main() {
  const inputText =
    'REIT means Real Estate Investmemt Trust. It helps to invest in properties partially which allows investors to take share of a large estate with small capital. Investor recieves the rental income from those properties as a yearly dividend. Also the base value of property appreciates under the hood. This system is widely accepted in many countries.'

  console.log('=== Text Transformer ===')
  const result = await overallChain.invoke({ text: inputText })
  console.log(result)
}

main().catch(console.error)

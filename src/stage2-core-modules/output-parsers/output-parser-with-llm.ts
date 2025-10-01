/**
 * Stage 2 – Core Modules: OutputParser with LLM Demo
 * Micro-project: Using OutputParsers with LLMChain
 *
 * Objectives:
 * 1. Demonstrate usage of OutputParsers (list, boolean, structured) with LLM output
 * 2. Show how to attach output parsers to LLMChain for automatic parsing
 * 3. Example of using Zod schema for structured output parsing
 *
 * Core Concepts Covered:
 * - OutputParser: parses and validates raw LLM text into structured data
 * - CommaSeparatedListOutputParser: parses comma-separated lists
 * - BooleanOutputParser: parses yes/no into boolean
 * - StructuredOutputParser: enforces schema (with Zod) for reliable JSON output
 * - Attaching outputParser to LLMChain for end-to-end parsing
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { LLMChain } from 'langchain/chains'
import {
  CommaSeparatedListOutputParser,
  BaseOutputParser,
  StructuredOutputParser,
} from '@langchain/core/output_parsers'
import { z } from 'zod'

// Initialize LLM
const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

async function runOutputParserExamples() {
  // 1️⃣ CommaSeparatedListOutputParser
  const listParser = new CommaSeparatedListOutputParser()
  const listPrompt = PromptTemplate.fromTemplate('Provide 5 fruits as a comma-separated list.')
  const listChain = new LLMChain({
    llm,
    prompt: listPrompt,
    outputParser: listParser as any,
  })
  const listResult = await listChain.call({})
  console.log('List Parser:', listResult) // → { text: ["apple", "banana", "mango", ...] }

  // 2️⃣ BooleanOutputParser
  class YesNoBooleanParser extends BaseOutputParser<boolean> {
    lc_namespace = ['custom', 'output_parsers']
    async parse(text: string) {
      const normalized = text.trim().toLowerCase()
      if (/(^|\b)(yes|true|y)(\b|$)/.test(normalized)) return true
      if (/(^|\b)(no|false|n)(\b|$)/.test(normalized)) return false
      throw new Error(`Unable to parse boolean from: ${text}`)
    }
    getFormatInstructions() {
      return 'Respond with only YES or NO.'
    }
  }
  const boolParser = new YesNoBooleanParser()
  const boolPrompt = PromptTemplate.fromTemplate('Answer yes or no: Is water wet?')
  const boolChain = new LLMChain({
    llm,
    prompt: boolPrompt,
    outputParser: boolParser as any,
  })
  const boolResult = await boolChain.call({})
  console.log('Boolean Parser:', boolResult) // → { text: true }

  // 3️⃣ StructuredOutputParser with Zod
  const structuredParser = StructuredOutputParser.fromZodSchema(
    z.object({
      sentiment: z.enum(['positive', 'neutral', 'negative']),
      summary: z.string(),
    }) as any,
  )
  const formatInstructions = structuredParser.getFormatInstructions()
  const structuredPrompt = PromptTemplate.fromTemplate(
    'Analyze the sentiment of the following review:\n{review}\n{format_instructions}',
  )
  const structuredChain = new LLMChain({
    llm,
    prompt: structuredPrompt,
    outputParser: structuredParser as any,
  })
  const structuredResult = await structuredChain.call({
    review: 'I loved the product, it works perfectly!',
    format_instructions: formatInstructions,
  })
  console.log('Structured Parser:', structuredResult)
  // → { sentiment: "positive", summary: "The user enjoyed the product." }

  // 4️⃣ Custom OutputParser
  class NumberExtractorParser extends BaseOutputParser<number | null> {
    lc_namespace = ['custom', 'output_parsers']
    async parse(text: string) {
      const match = text.match(/\d+/)
      return match ? Number(match[0]) : null
    }
    getFormatInstructions() {
      return 'Respond with a number only.'
    }
  }

  const numParser = new NumberExtractorParser()
  const numPrompt = PromptTemplate.fromTemplate('What is 12 + 8? {format_instructions}')
  const numChain = new LLMChain({
    llm,
    prompt: numPrompt,
    outputParser: numParser as any,
  })
  const numResult = await numChain.call({
    format_instructions: numParser.getFormatInstructions(),
  })
  console.log('Custom Number Parser:', numResult) // → { text: 20 }
}

runOutputParserExamples()

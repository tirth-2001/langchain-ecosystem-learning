/**
 * Stage 3 – Agents: Plan-and-Execute Agent Demo
 * Micro-project: Plan-and-Execute with factory `fromLLMAndTools`
 *
 * Objectives:
 * 1. Build a Plan-and-Execute pipeline using a single LLM for both roles
 * 2. Attach multiple tools and run a multi-step task end-to-end
 * 3. Show how to invoke the executor and inspect the final output
 *
 * Core Concepts Covered:
 * - PlanAndExecuteAgentExecutor: planner + step executor orchestration
 * - Tool wiring with `DynamicTool`
 * - Deterministic planning via low-temperature chat models
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { DynamicTool } from 'langchain/tools'
import { PlanAndExecuteAgentExecutor } from 'langchain/experimental/plan_and_execute'

// -----------------------
// Tools (demo/stub implementations)
// -----------------------
const searchTool = new DynamicTool({
  name: 'Search',
  description: 'Return a short factual result for a query (demo stub).',
  func: async (input: string) => {
    if (input.toLowerCase().includes('langchain')) {
      return 'LangChain is a framework for building applications with LLMs.'
    }
    return `Simulated search result for "${input}"`
  },
})

const summarizerTool = new DynamicTool({
  name: 'Summarizer',
  description: 'Summarize the given text into 1-2 sentences.',
  func: async (input: string) => {
    return `Summary: ${input.slice(0, 120)}${input.length > 120 ? '...' : ''}`
  },
})

const translatorTool = new DynamicTool({
  name: 'Translator',
  description: 'Translate English text into French (demo stub).',
  func: async (input: string) => {
    return `Traduction (fr): ${input}`
  },
})

// -----------------------
// LLM (planner + executor can be the same model; you can use different LLMs)
// -----------------------
const llm = new ChatOpenAI({
  modelName: 'gpt-4.1-mini',
  temperature: 0, // low temp helps with deterministic plans
})

// -----------------------
// Build the Plan-and-Execute executor via factory
// -----------------------
async function main() {
  const tools = [searchTool, summarizerTool, translatorTool]

  // Static factory (recommended): creates a planner + step executor and returns an executor
  // You can optionally pass a humanMessageTemplate if you want to customize planner input.
  const executor = await PlanAndExecuteAgentExecutor.fromLLMAndTools({
    llm,
    tools,
    verbose: true,
    // humanMessageTemplate: "Custom template: {input}" // optional
  })

  // Run a complex task that benefits from planning
  const query = 'Find what REITs are, summarize it, and then translate the summary into French.'

  console.log('Running Plan-and-Execute query:\n', query)
  const result = await executor.invoke({ input: query })

  // `invoke` returns a dict-like result. Output key is typically 'output'.
  console.log('\n=== Final executor output ===')
  console.log(result.output ?? result)
}

main().catch(console.error)

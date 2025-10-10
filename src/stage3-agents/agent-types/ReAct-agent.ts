/**
 * Stage 3 – Agents: ReAct Agent Demo
 * Micro-project: Multi-step reasoning with explicit Action/Observation format
 *
 * Objectives:
 * 1. Wire up a ReAct agent with Calculator and Search tools
 * 2. Enforce strict Action / Action Input / Observation formatting via prompt
 * 3. Demonstrate iterative tool use and final answer generation
 *
 * Core Concepts Covered:
 * - ReAct loop with `createReactAgent` and `AgentExecutor`
 * - `DynamicTool` for simple tool adapters
 * - Stabilizing outputs with low-temperature chat models
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
import { DynamicTool } from 'langchain/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'

// ----- Tools -----
// Calculator: eval-based demo (safe-only-for-local-demo; sanitize/implement properly in prod)
const calculatorTool = new DynamicTool({
  name: 'Calculator',
  description: 'Useful for arithmetic calculations. Input should be a math expression.',
  func: async (input: string) => {
    try {
      // safe eval is required in production — this is just a demo
      // you may want to use a math library instead of eval
      // ensure input contains only numbers/operators
      return eval(input).toString()
    } catch (err) {
      return `Error in calculation: ${String(err)}`
    }
  },
})

// Simple search stub (returns canned answers or call a real API)
const searchTool = new DynamicTool({
  name: 'Search',
  description: 'Search for factual information given a short query. Returns short factual text.',
  func: async (input: string) => {
    // Replace with real API or vector retrieval in real app
    if (input.toLowerCase().includes('langchain')) {
      return 'LangChain is a framework for building applications with LLMs.'
    }
    return `Simulated search result for "${input}"`
  },
})

// ----- LLM -----
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0, // low temperature to keep format stable
})

// ----- Explicit ReAct Prompt (IMPORTANT) -----
// This prompt forces the intermediate-action format. The agent *must* only use the following action format:
// Action: <TOOL_NAME>
// Action Input: <input>
// After observing, the tool result will be appended as Observation: <result>
// When done, produce "Final Answer: <answer>"
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an agent that follows the ReAct pattern. You have access to the following tools:
{tools}

Tool names you can use: {tool_names}

When you decide to use a tool, you MUST emit EXACTLY:
Action: <TOOL_NAME>
Action Input: <input>

After the tool returns, you will see an Observation and you can continue reasoning.
When finished, produce a single line starting with "Final Answer:" followed by the answer.
Do not include any extra commentary outside the Action / Observation markers.`,
  ],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
])

// ----- Create agent + executor -----
async function runReActDemo() {
  const agent = await createReactAgent({ llm, tools: [calculatorTool, searchTool], prompt })
  const executor = new AgentExecutor({ agent, tools: [calculatorTool, searchTool], verbose: true })

  // Example queries:
  const queries = ['What is 25 * 4 + 10?', 'Tell me briefly: what is LangChain?']

  for (const q of queries) {
    console.log('\n=== QUERY ===\n', q)
    const res = await executor.invoke({ input: q })
    console.log('=== RESULT OUTPUT ===\n', res.output)
  }
}

runReActDemo().catch(console.error)

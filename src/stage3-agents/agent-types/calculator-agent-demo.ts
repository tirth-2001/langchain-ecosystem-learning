/**
 * Stage 3 – Agents: Calculator Tool (Tool-Calling Agent)
 * Micro-project: Minimal tool-calling agent with a calculator tool
 *
 * Objectives:
 * 1. Define a simple `DynamicTool` for arithmetic evaluation
 * 2. Build a tool-calling agent that invokes the calculator when needed
 * 3. Run a demo query and print the final answer
 *
 * Core Concepts Covered:
 * - `createToolCallingAgent` and `AgentExecutor`
 * - Tool registration and execution flow
 * - Deterministic outputs with low-temperature models
 */
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { DynamicTool } from 'langchain/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'

// 1️⃣ Define the Calculator Tool
const calculatorTool = new DynamicTool({
  name: 'Calculator',
  description: 'Useful for arithmetic calculations',
  func: async (input: string) => {
    try {
      // simple eval-based calculation for demo
      return eval(input).toString()
    } catch (err) {
      return 'Error in calculation'
    }
  },
})

// 2️⃣ Initialize LLM
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
})

// Run Demo
async function runDemo() {
  // 3️⃣ Initialize Tool-Calling Agent (avoids ReAct output parsing)
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You can call tools to help with tasks when needed.'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ])
  const agent = await createToolCallingAgent({ llm, tools: [calculatorTool], prompt })
  const executor = new AgentExecutor({ agent, tools: [calculatorTool], verbose: true })

  const inputQuery = 'Calculate 25 * 4 + 10'
  console.log('Input:', inputQuery)
  const result = await executor.invoke({ input: inputQuery })
  console.log('Output:', result.output)
}

runDemo()

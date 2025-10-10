/**
 * Stage 3 – Agents: ReAct Multi-Tool Assistant
 * Micro-project: ReAct agent reasoning with multiple tools (Calculator, Search, Todo)
 *
 * Objectives:
 * 1. Register and use multiple tools with a ReAct agent
 * 2. Prompt the agent to follow strict tool-use formatting
 * 3. Execute several diverse queries end-to-end
 *
 * Core Concepts Covered:
 * - ReAct agent with `createReactAgent` + `AgentExecutor`
 * - `DynamicTool` adapters for quick tool scaffolding
 * - Deterministic outputs via low-temperature LLMs
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
import { DynamicTool } from 'langchain/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'

// -----------------------
// 1️⃣ Define Tools
// -----------------------

// Calculator tool (⚠️ for demo only: uses eval; replace with safe math lib in prod)
const calculatorTool = new DynamicTool({
  name: 'Calculator',
  description: 'Performs arithmetic calculations. Input must be a valid math expression (e.g., 2+2*5).',
  func: async (input: string) => {
    try {
      return eval(input).toString()
    } catch {
      return 'Error: invalid math expression'
    }
  },
})

// Search tool (stubbed; replace with real API)
const searchTool = new DynamicTool({
  name: 'Search',
  description: 'Search for factual information. Input should be a short query.',
  func: async (input: string) => {
    if (input.toLowerCase().includes('langchain')) {
      return 'LangChain is a framework for building applications with LLMs.'
    }
    return `Simulated search result for "${input}"`
  },
})

// Todo tool (in-memory)
let todos: string[] = []
const todoTool = new DynamicTool({
  name: 'TodoTool',
  description: 'Adds a todo item to a list. Input should be the todo string.',
  func: async (input: string) => {
    todos.push(input)
    return `Added todo: "${input}". Current list: ${todos.join(', ')}`
  },
})

// -----------------------
// 2️⃣ Initialize LLM
// -----------------------
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0, // keep format deterministic
})

// -----------------------
// 3️⃣ ReAct Prompt
// -----------------------
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an assistant that follows the ReAct pattern. You have access to the following tools:
{tools}

Tool names you can use: {tool_names}

When you want to use a tool, follow this EXACT format:

Action: <TOOL_NAME>
Action Input: <input>

Then I will give you the Observation.
Continue reasoning until you reach the final answer.
When finished, output ONLY:

Final Answer: <answer>

No extra text outside this format.`,
  ],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
])

// -----------------------
// 4️⃣ Create Agent + Executor
// -----------------------
async function main() {
  const tools = [calculatorTool, searchTool, todoTool]
  const agent = await createReactAgent({ llm, tools, prompt })
  const executor = new AgentExecutor({ agent, tools, verbose: false })

  // Demo queries
  const queries = [
    'What is 12 * 8 + 50?',
    'What is LangChain?',
    'Add a todo: "Install langchain"',
    "Search for LangChain, then add a todo: 'Read docs about it', and finally calculate 20*5.",
    'Give me count of total number of todos and a comma separated list of todos',
  ]

  for (const q of queries) {
    console.log('\n==============================')
    console.log('Query:', q)
    const result = await executor.invoke({ input: q })
    console.log('Final Output:', result.output)
  }
}

main().catch(console.error)

/**
 * Stage 3 – Agents: Temperature Conversion Tool (Tool-Calling Agent)
 * Micro-project: Custom `DynamicTool` for Celsius/Fahrenheit conversion
 *
 * Objectives:
 * 1. Implement a domain-specific tool with simple parsing
 * 2. Register the tool with a modern tool-calling agent
 * 3. Execute example queries to verify behavior
 *
 * Core Concepts Covered:
 * - `DynamicTool` for bespoke agent tools
 * - `createToolCallingAgent` + `AgentExecutor`
 * - Prompt with `MessagesPlaceholder` for agent scratchpad
 */
import 'dotenv/config'
import { DynamicTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'

// 1. Define a custom temperature conversion tool
const temperatureTool = new DynamicTool({
  name: 'temperature_converter',
  description:
    "Converts temperature between Celsius and Fahrenheit. Input must be in the format 'toF: <number>' or 'toC: <number>'.",
  func: async (input: string) => {
    try {
      if (input.startsWith('toF:')) {
        const value = parseFloat(input.split(':')[1].trim())
        return `${value}°C = ${(value * 9) / 5 + 32}°F`
      } else if (input.startsWith('toC:')) {
        const value = parseFloat(input.split(':')[1].trim())
        return `${value}°F = ${((value - 32) * 5) / 9}°C`
      } else {
        return "Invalid format. Use 'toF: <number>' or 'toC: <number>'."
      }
    } catch (e) {
      return 'Error: Could not parse input.'
    }
  },
})

// 2. Setup the LLM
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
})

// 3. Create an executor with the tool (modern API)
const runAgent = async () => {
  const tools = [temperatureTool]
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant. Use tools when needed to answer.'],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ])
  const agent = await createToolCallingAgent({ llm: model, tools, prompt })
  const executor = new AgentExecutor({ agent, tools, verbose: true })

  console.log('Agent ready! Ask it something...')

  const result1 = await executor.invoke({ input: 'Convert 25 Celsius to Fahrenheit' })
  console.log('Result1:', result1.output)

  const result2 = await executor.invoke({ input: 'What is 77 Fahrenheit in Celsius?' })
  console.log('Result2:', result2.output)
}

runAgent().catch(console.log)

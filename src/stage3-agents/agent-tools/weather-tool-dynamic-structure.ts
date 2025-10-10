/**
 * Stage 3 – Agents: Weather Tool (Dynamic Structured Input)
 * Micro-project: `DynamicStructuredTool` with Zod schema for weather queries
 *
 * Objectives:
 * 1. Define a tool with structured inputs validated by Zod
 * 2. Use a tool-calling agent that emits well-formed tool inputs
 * 3. Run demonstration queries with different units and dates
 *
 * Core Concepts Covered:
 * - `DynamicStructuredTool` + Zod schemas
 * - `createToolCallingAgent` and `AgentExecutor`
 * - Agent scratchpad via `MessagesPlaceholder`
 */

import 'dotenv/config'
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'

const weatherSchema = z.object({
  city: z.string().describe('The name of the city to check weather for'),
  date: z.string().describe('The date in YYYY-MM-DD format'),
  unit: z.enum(['C', 'F']).describe('The unit for temperature output'),
})

const weatherTool = new DynamicStructuredTool({
  name: 'get_weather',
  description: 'Get the weather forecast for a specific city and day',
  schema: weatherSchema,
  func: async (input) => {
    const { city, date, unit } = weatherSchema.parse(input)
    // Dummy weather data (replace with API call in real project)
    const forecast = {
      tempC: 25,
      tempF: 77,
      condition: 'Sunny',
    }

    const temp = unit === 'C' ? `${forecast.tempC}°C` : `${forecast.tempF}°F`
    return `Weather in ${city} on ${date}: ${forecast.condition}, ${temp}`
  },
})

// LLM and agent setup mirroring temperature-conversion-tool.ts
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
})

const runAgent = async () => {
  const tools = [weatherTool]
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant. Use tools when needed to answer.'],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ])

  const agent = await createToolCallingAgent({ llm: model, tools, prompt })
  const executor = new AgentExecutor({ agent, tools, verbose: true })

  console.log('Weather agent ready! Ask it something...')

  const result1 = await executor.invoke({
    input: "What's the weather in Paris on 2025-10-07 in Celsius?",
  })
  console.log('Result1:', result1.output)

  const result2 = await executor.invoke({
    input: 'Give me the forecast for New York on 2025-12-01 in Fahrenheit.',
  })
  console.log('Result2:', result2.output)
}

runAgent().catch(console.log)

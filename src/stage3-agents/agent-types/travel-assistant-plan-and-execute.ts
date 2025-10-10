/**
 * Stage 3 – Agents: Travel Assistant (Plan-and-Execute)
 * Micro-project: Manual planner + step executor with custom prompt
 *
 * Objectives:
 * 1. Manually construct planner and step executor with different LLMs
 * 2. Customize executor prompt for strict JSON tool-calling
 * 3. Build a simple travel itinerary with multiple tools
 *
 * Core Concepts Covered:
 * - `PlanAndExecuteAgentExecutor` with manual planner/step-executor wiring
 * - Tool descriptions and tool name lists fed into prompts
 * - Low-temperature, deterministic planning and execution
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { DynamicTool } from 'langchain/tools'
import { PlanAndExecuteAgentExecutor } from 'langchain/experimental/plan_and_execute'

// -----------------------
// Demo Tools
// -----------------------
const travelSearchTool = new DynamicTool({
  name: 'TravelSearch',
  description: 'Search for popular attractions, food, and activities in a city.',
  func: async (input: string) => {
    if (input.toLowerCase().includes('paris')) {
      return 'Paris highlights: Eiffel Tower, Louvre Museum, Seine River cruise, Montmartre, French pastries.'
    }
    return `Top things to do in ${input}: Central Park, Times Square, Statue of Liberty, Broadway shows.`
  },
})

const weatherTool = new DynamicTool({
  name: 'WeatherLookup',
  description: 'Get the expected weather for the destination (demo).',
  func: async (input: string) => {
    return `Weather for ${input}: Sunny, ~22°C during day, 14°C at night.`
  },
})

const itineraryFormatter = new DynamicTool({
  name: 'ItineraryFormatter',
  description: 'Convert gathered info into a structured 2-day JSON itinerary.',
  func: async (input: string) => {
    return JSON.stringify(
      {
        day1: [`Morning: Visit ${input.split(',')[0]}`, 'Afternoon: Local food tour', 'Evening: River cruise'],
        day2: ['Morning: Art museum visit', 'Afternoon: Historic neighborhood walk', 'Evening: Dinner & nightlife'],
      },
      null,
      2,
    )
  },
})

// -----------------------
// LLMs
// -----------------------
const plannerLLM = new ChatOpenAI({
  modelName: 'gpt-4.1-mini', // planner
  temperature: 0,
})

const executorLLM = new ChatOpenAI({
  modelName: 'gpt-4.1-mini', // executor
  temperature: 0,
})

const tools = [travelSearchTool, weatherTool, itineraryFormatter]

// -----------------------
// Custom Planner Prompt
// -----------------------
const toolDescriptions = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n')
const toolNames = tools.map((t) => t.name).join(', ')
const executorTemplate = ` You are the executor. Your job is to EXECUTE the planner's steps by calling tools when needed. Tools available: ${toolDescriptions} Tool names: ${toolNames} When you want to call a tool, you MUST output ONLY a single JSON object (and nothing else) in this exact shape: {{ "action": "<TOOL_NAME>", "action_input": "<the input string for the tool>" }} Use double quotes, valid JSON, and the exact keys "action" and "action_input". Do NOT add any extra explanation or text when emitting this JSON. After the environment runs the tool, you will receive an Observation and then can either call another tool (by again outputting ONLY the JSON object), or produce the final answer. When producing the final answer (after any tool calls), format the final result as a JSON itinerary string. Begin by following the planner's current_step input. `

// -----------------------
// Manual Construction using supported helpers
// -----------------------
async function main() {
  const planner = await PlanAndExecuteAgentExecutor.getDefaultPlanner({
    llm: plannerLLM,
    tools,
  })

  const stepExecutor = PlanAndExecuteAgentExecutor.getDefaultStepExecutor({
    llm: executorLLM,
    tools,
    humanMessageTemplate: executorTemplate,
  })

  const agent = new PlanAndExecuteAgentExecutor({
    planner,
    stepExecutor,
    verbose: true,
  })

  const userQuery =
    'Plan a 2-day Paris trip with main attractions and consider the weather. Output in JSON itinerary format.'

  console.log('=== Travel Research Assistant Demo ===')
  console.log('User query:', userQuery)

  const result = await agent.invoke({ input: userQuery })

  console.log('\n=== Final Itinerary Output ===')
  console.log(result.output ?? result)
}

main().catch(console.log)

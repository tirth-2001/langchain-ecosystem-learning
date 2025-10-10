/**
 * Stage 4 – Tools: Food Delivery Agent Toolkit Demo
 * Micro-project: Complete toolkit for food delivery operations
 *
 * Objectives:
 * 1. Demonstrate a comprehensive toolkit with multiple specialized tools
 * 2. Show tool coordination and context management
 * 3. Implement real-world food delivery workflow simulation
 *
 * Core Concepts Covered:
 * - `FoodDeliveryToolkit` with multiple specialized tools
 * - Context management with `contextStore`
 * - Tool coordination patterns
 * - Real-world API simulation and error handling
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { FoodDeliveryToolkit } from './tools/toolkit'
import { contextStore } from './utils/contextStore'

const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.2,
})

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a Food Delivery Assistant who can search, fetch menus, calculate bills, and place orders.'],
  ['human', '{input}'],
  new MessagesPlaceholder('agent_scratchpad'),
])

async function run() {
  contextStore.clear()

  const agent = await createToolCallingAgent({
    llm: model,
    tools: FoodDeliveryToolkit,
    prompt,
  })

  const executor = new AgentExecutor({
    agent,
    tools: FoodDeliveryToolkit,
    verbose: true,
    returnIntermediateSteps: true,
  })

  const response = await executor.invoke({
    input: 'Find Biryani Express restaurant, fetch its menu, order Veg Pizza and Coke, and place the order.',
  })

  console.log('Final Response:\n', response.output)
}

run().catch(console.error)

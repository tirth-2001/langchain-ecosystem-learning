/**
 * Stage 3 – Agents: Structured Tool-Using Agent
 * Micro-project: `createStructuredChatAgent` with `DynamicStructuredTool` and Zod schemas
 *
 * Objectives:
 * 1. Define tools with input schemas and validate with Zod
 * 2. Build a structured agent that emits well-formed tool inputs
 * 3. Invoke the agent and print normalized outputs
 *
 * Core Concepts Covered:
 * - `DynamicStructuredTool` with Zod schemas
 * - `createStructuredChatAgent` and `AgentExecutor`
 * - Parser-guided formatting with `StructuredOutputParser`
 */
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { createStructuredChatAgent, AgentExecutor } from 'langchain/agents'
import { StructuredOutputParser } from '@langchain/core/output_parsers'

// ----------------------------
// 1. Define Tools with Structured Schema + Parsers
// ----------------------------

// Parser for calculator
const calculatorParser = StructuredOutputParser.fromZodSchema(z.object({ expression: z.string() }) as any)

// Parser for translator
const translatorParser = StructuredOutputParser.fromZodSchema(z.object({ text: z.string() }) as any)

const calculator = new DynamicStructuredTool({
  name: 'calculator',
  description: 'Evaluate a simple math expression',
  schema: z.object({ expression: z.string() }),
  func: async (input: unknown) => {
    let parsed: { expression: string }
    if (typeof input === 'string') {
      // fallback for raw string from LLM
      parsed = { expression: input }
    } else {
      parsed = z.object({ expression: z.string() }).parse(input)
    }
    const { expression } = parsed
    try {
      return eval(expression).toString()
    } catch {
      return 'Error evaluating expression'
    }
  },
})

const translator = new DynamicStructuredTool({
  name: 'translator',
  description: 'Translate English text to French',
  schema: z.object({ text: z.string() }),
  func: async (input: unknown) => {
    const { text } = z.object({ text: z.string() }).parse(input)
    return `FR(${text})` // dummy translator
  },
})

// ----------------------------
// 2. Define LLM
// ----------------------------
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
})

// ----------------------------
// 3. Generate Dynamic Tool Instructions
// ----------------------------
function getToolInstructions(tools: DynamicStructuredTool[]) {
  return tools
    .map((tool) => {
      let parser: StructuredOutputParser<any>
      if (tool.name === 'calculator') parser = calculatorParser
      else if (tool.name === 'translator') parser = translatorParser
      else throw new Error(`Parser not defined for tool: ${tool.name}`)

      const instructions = parser.getFormatInstructions()
      return `${tool.name}: ${tool.description}\nInput format:\n${instructions}`
    })
    .join('\n\n')
}

// ----------------------------
// 4. Run Agent
// ----------------------------
async function run() {
  const tools = [calculator, translator]
  // const toolInstructions = getToolInstructions(tools)
  // const escapedToolInstructions = toolInstructions.replace(/{/g, '{{').replace(/}/g, '}}')

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a helpful assistant. Think step-by-step.
You have access to the following tools:
{tools}

Tool names you can call: {tool_names}

Use tools when needed, otherwise answer directly.`,
    ],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ])

  const agent = await createStructuredChatAgent({
    llm,
    tools,
    prompt,
  })

  const executor = new AgentExecutor({
    agent,
    tools,
    verbose: true,
  })

  const result = await executor.invoke({
    input: "Translate 'Learning is refreshing activity' into French, but first calculate 70/5",
  })

  console.log('=== Structured Agent Output ===')
  console.log(result.output)
}

run().catch(console.error)

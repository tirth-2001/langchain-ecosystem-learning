import 'dotenv/config'
import { TavilySearch } from '@langchain/tavily'
import { NodeFileStore } from 'langchain/stores/file/node'
import { WriteFileTool, ReadFileTool } from 'langchain/tools'
import { Calculator } from '@langchain/community/tools/calculator'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'

// =======================
// 1. Setup
// =======================

const model = new ChatOpenAI({
  modelName: 'gpt-4.1-mini',
  temperature: 0,
})

const fileStorePath = path.join(__dirname, 'file_store')
if (!existsSync(fileStorePath)) mkdirSync(fileStorePath, { recursive: true })

// Create NodeFileStore for Read/Write tools
const store = new NodeFileStore(fileStorePath)
const readFileTool = new ReadFileTool({ store })
const writeFileTool = new WriteFileTool({ store })

// =======================
// 2. Tavily Search Tool (with explicit invoke override for string return)
// =======================
const webSearchTavilyTool = new TavilySearch({
  tavilyApiKey: process.env.TAVILY_API_KEY,
})
webSearchTavilyTool.invoke = async (input) => {
  const res = await TavilySearch.prototype.call.call(webSearchTavilyTool, input)
  return JSON.stringify(res, null, 2)
}

const calculatorTool = new Calculator()
const tools = [webSearchTavilyTool, calculatorTool, readFileTool, writeFileTool]

// =======================
// 3. Prepare a sample file for reading
// =======================
const countryFilePath = path.join(fileStorePath, 'countries_list.txt')
if (!existsSync(countryFilePath)) {
  writeFileSync(countryFilePath, 'India\nUSA\nChina\nBrazil\nJapan', 'utf-8')
  console.log('Created countries_list.txt file with default countries.')
}

// =======================
// 4. Define Prompt
// =======================
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an intelligent assistant who can read files, search the web for information, and perform calculations.
You will:
1. Read the list of countries from "countries_list.txt" using the ReadFileTool.
2. For each country, use TavilySearch to find its population (most recent or estimated).
3. Use Calculator to compute the total sum of all populations.
4. Write a detailed summary to "population_summary.txt" using the WriteFileTool.
Include each country's population and the final total sum.`,
  ],
  ['human', '{input}'],
  new MessagesPlaceholder('agent_scratchpad'),
])

// =======================
// 5. Agent Execution
// =======================
async function runAgent() {
  const agent = await createToolCallingAgent({ llm: model, tools, prompt })

  const executor = new AgentExecutor({
    agent,
    tools,
    verbose: true,
  })

  const response = await executor.invoke({
    input: 'Start by reading the countries list and generate the population summary.',
  })

  console.log('===============================')
  console.log('Final Response:', response.output)
  console.log('===============================')
  console.log('Check the file_store/population_summary.txt file for written data.')
}

runAgent().catch(console.error)

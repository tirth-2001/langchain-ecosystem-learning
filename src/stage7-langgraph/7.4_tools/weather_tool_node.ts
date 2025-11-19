/**
 * Stage 7 – LangGraph Tools: External API Integration
 * Micro-project: Weather API tool graph
 *
 * Objectives:
 * 1. Integrate an external REST API (wttr.in) as a graph tool
 * 2. Use an LLM to extract parameters (location) from user input
 * 3. Fetch real-time data and format it into a natural language response
 *
 * Core Concepts Covered:
 * - Parameter Extraction: Getting structured data (location) from text
 * - API Tools: Making HTTP requests (axios) within a node
 * - Data Formatting: Converting raw JSON into user-friendly text
 */

import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import axios from 'axios'
import 'dotenv/config'

/* ---------------------------------- */
/* 1️⃣ State Model */
/* ---------------------------------- */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  location: Annotation<string>({ reducer: (_, u) => u ?? _ }),
  weatherJson: Annotation<any>({ reducer: (_, u) => u ?? _ }),
  answer: Annotation<string>({ reducer: (_, u) => u ?? _ }),
})

/* ---------------------------------- */
/* 2️⃣ LLM Setup */
/* ---------------------------------- */
const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

/* Extract Location Node (LLM) */
const extractLocationPrompt = ChatPromptTemplate.fromTemplate(`
Extract only the location from the user message:
"{input}"
Return only the location, no extra words.
`)
const extractLocationChain = RunnableSequence.from([extractLocationPrompt, model, (out) => out.content.trim()])

async function extractLocationNode(state: typeof StateAnnotation.State) {
  console.log('📍 Extracting location...')
  const location = await extractLocationChain.invoke({ input: state.input })
  return { location }
}

/* Weather Tool Node (HTTP API) */
async function weatherToolNode(state: typeof StateAnnotation.State) {
  console.log('🌦 Fetching weather for:', state.location)

  if (!state.location) return { weatherJson: { error: 'No location found' } }

  const url = `https://wttr.in/${encodeURIComponent(state.location)}?format=j1`

  try {
    const res = await axios.get(url)
    return { weatherJson: res.data }
  } catch {
    return { weatherJson: { error: 'Weather fetch failed' } }
  }
}

/* Answer Node */
const answerPrompt = ChatPromptTemplate.fromTemplate(`
Turn the JSON weather into a helpful, friendly response.

Location: {location}
Weather JSON: {weatherJson}
`)
const answerChain = RunnableSequence.from([answerPrompt, model, (out) => out.content.trim()])

async function weatherAnswerNode(state: typeof StateAnnotation.State) {
  const answer = await answerChain.invoke({
    location: state.location,
    weatherJson: JSON.stringify(state.weatherJson),
  })
  return { answer }
}

/* ---------------------------------- */
/* 3️⃣ Graph Assembly */
/* ---------------------------------- */
const workflow = new StateGraph(StateAnnotation)
  .addNode('extractLocationNode', extractLocationNode)
  .addNode('weatherToolNode', weatherToolNode)
  .addNode('weatherAnswerNode', weatherAnswerNode)
  .addEdge(START, 'extractLocationNode')
  .addEdge('extractLocationNode', 'weatherToolNode')
  .addEdge('weatherToolNode', 'weatherAnswerNode')
  .addEdge('weatherAnswerNode', END)

const app = workflow.compile()

/* ---------------------------------- */
/* 4️⃣ Demo Runner */
/* ---------------------------------- */
async function main() {
  console.log('\n🌍 7.4.2 — Weather Tool Graph Demo\n')

  const userQueries = ["What's the weather in Tokyo?", 'Weather at Mumbai', 'Tell me temperature for New York today']

  for (const input of userQueries) {
    console.log(`\n👤 User: ${input}`)
    const result = await app.invoke({ input })
    console.log('📍 Location:', result.location)
    console.log('🌦 Weather JSON:', JSON.stringify(result.weatherJson).slice(0, 120) + '...')
    console.log('🤖 Final Answer:', result.answer)
  }
}

main().catch(console.error)

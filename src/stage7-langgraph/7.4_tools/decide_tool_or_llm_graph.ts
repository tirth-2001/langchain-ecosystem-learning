/**
 * 7.4.3 — Decide + Tool Graph
 */
import axios from 'axios'
import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/* ---------------------------------- */
/* 1️⃣ State */
/* ---------------------------------- */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  route: Annotation<string>({ reducer: (_, u) => u ?? _ }),
  weatherJson: Annotation<any>({ reducer: (_, u) => u ?? _ }),
  final: Annotation<string>({ reducer: (_, u) => u ?? _ }),
})

/* LLM */
const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

/* ---------------------------------- */
/* 2️⃣ Classifier Node */
/* ---------------------------------- */
const classifyPrompt = ChatPromptTemplate.fromTemplate(`
Classify the user request into:
- "weather" → if weather, temperature, climate, rain
- "llm" → anything else
Return only one word.
User input: "{input}"
`)

const classifyChain = RunnableSequence.from([classifyPrompt, model, (o) => o.content.trim().toLowerCase()])

async function classifierNode(state: typeof StateAnnotation.State) {
  const route = await classifyChain.invoke({ input: state.input })
  console.log('🔍 Classifier:', route)
  return { route }
}

/* ---------------------------------- */
/* 3️⃣ Weather Tool Node */
/* ---------------------------------- */
async function weatherToolNode(state: typeof StateAnnotation.State) {
  try {
    const url = `https://wttr.in/${encodeURIComponent(state.input)}?format=j1`
    const json = await axios.get(url).then((r) => r.data)
    return { weatherJson: json }
  } catch {
    return { weatherJson: { error: 'fetch failed' } }
  }
}

/* Weather → Answer  */
const weatherAnswerPrompt = ChatPromptTemplate.fromTemplate(`
Location: {input}
Weather JSON: {weatherJson}
Write a short, friendly weather summary.
`)
const weatherAnsChain = RunnableSequence.from([weatherAnswerPrompt, model, (o) => o.content.trim()])

async function weatherAnswerNode(state: typeof StateAnnotation.State) {
  return {
    final: await weatherAnsChain.invoke({
      input: state.input,
      weatherJson: JSON.stringify(state.weatherJson),
    }),
  }
}

/* ---------------------------------- */
/* 4️⃣ Normal LLM Answer Node */
/* ---------------------------------- */
const normalChatPrompt = ChatPromptTemplate.fromTemplate(`
Respond conversationally:

User: {input}
`)
const normalChatChain = RunnableSequence.from([normalChatPrompt, model, (o) => o.content.trim()])

async function llmAnswerNode(state: typeof StateAnnotation.State) {
  return { final: await normalChatChain.invoke({ input: state.input }) }
}

/* ---------------------------------- */
/* 5️⃣ Build Graph */
/* ---------------------------------- */
const workflow = new StateGraph(StateAnnotation)
  .addNode('classifierNode', classifierNode)
  .addNode('weatherToolNode', weatherToolNode)
  .addNode('weatherAnswerNode', weatherAnswerNode)
  .addNode('llmAnswerNode', llmAnswerNode)
  .addEdge(START, 'classifierNode')
  .addConditionalEdges('classifierNode', (state) => state.route, {
    weather: 'weatherToolNode',
    llm: 'llmAnswerNode',
  })
  .addEdge('weatherToolNode', 'weatherAnswerNode')
  .addEdge('weatherAnswerNode', END)
  .addEdge('llmAnswerNode', END)

const app = workflow.compile()

/* ---------------------------------- */
/* 6️⃣ Demo */
/* ---------------------------------- */
async function main() {
  const tests = ['What’s the weather in Paris?', 'Tell me a joke', 'Temperature for Mumbai']

  for (const input of tests) {
    console.log('\n=====================')
    console.log('👤 User:', input)
    const r = await app.invoke({ input })
    console.log('🤖 Final:', r.final)
  }
}

main().catch(console.error)

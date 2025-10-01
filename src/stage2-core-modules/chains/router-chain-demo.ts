import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { Runnable, RunnableBranch, RunnableSequence } from '@langchain/core/runnables'

// 1️⃣ Destination Chains

// General purpose chain
const generalChain = new PromptTemplate({
  template: 'You are a friendly general-purpose assistant. Answer the question: {query}',
  inputVariables: ['query'],
})
  .pipe(new ChatOpenAI({ model: 'gpt-4o-mini', openAIApiKey: process.env.OPENAI_API_KEY }))
  .pipe(new StringOutputParser())

// Math-specific chain
const mathChain = new PromptTemplate({
  template: 'You are a highly accurate math assistant. Solve the math problem: {query}',
  inputVariables: ['query'],
})
  .pipe(new ChatOpenAI({ model: 'gpt-4o-mini', openAIApiKey: process.env.OPENAI_API_KEY }))
  .pipe(new StringOutputParser())

// 2️⃣ Routing/Classification Chain
const routerTemplate = `
Given the user query below, classify it as one of the following topics: 'MATH' or 'GENERAL'.
Return ONLY the word of the topic. Do not include any other text.
Query: {query}
Classification:
`

const routerPrompt = PromptTemplate.fromTemplate(routerTemplate)

const classificationChain = RunnableSequence.from([
  routerPrompt,
  new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY }),
  new StringOutputParser(),
])

const mathCondition = new Runnable(async (input: { topic: string }) => {
  return input.topic.toUpperCase().includes('MATH')
})

const routingBranch = new RunnableBranch({
  branches: [[mathCondition, mathChain]],
  default: generalChain,
})

// 3️⃣ Create RunnableBranch
// const routingBranch = new RunnableBranch({
//   branches: [[Runnable.from((input: { topic: string }) => input.topic.toUpperCase().includes('MATH')), mathChain]],
//   default: generalChain,
// })

// 4️⃣ Full RouterChain using RunnableSequence
const fullRouterChain = RunnableSequence.from([
  // Step 1: classify the query
  {
    topic: classificationChain,
    query: (input: { query: string }) => input.query, // pass original query
  },
  // Step 2: route to the correct chain
  routingBranch,
])

// 5️⃣ Demo
async function runDemo() {
  const mathResult = await fullRouterChain.invoke({ query: 'What is 20 divided by 4?' })
  console.log('Math Query Result:', mathResult)

  const generalResult = await fullRouterChain.invoke({ query: 'Tell me a short story.' })
  console.log('General Query Result:', generalResult)
}

runDemo().catch(console.error)

/*

import 'dotenv/config'

import { ChatOpenAI } from '@langchain/openai'
import { LLMChain, LLMRouterChain, MultiRouteChain, RouterChain } from 'langchain/chains'
import { ChatPromptTemplate } from '@langchain/core/prompts'

// LLM instance to be reused across all chains
const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY })

// 1️⃣ Summarizer chain
const summarizerPrompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant that summarizes text.'],
  ['human', 'Summarize the following text:\n\n{text}'],
])

const summarizerChain = new LLMChain({
  llm,
  prompt: summarizerPrompt,
  outputKey: 'summary',
})

// 2️⃣ Translator chain
const translatorPrompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant that translates text to French.'],
  ['human', 'Translate the following text to French:\n\n{text}'],
])

const translatorChain = new LLMChain({
  llm,
  prompt: translatorPrompt,
  outputKey: 'translation',
})

// 3️⃣ Router prompt: decides which chain to run
const routerPrompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a router. Decide which chain is best for the user input.'],
  [
    'human',
    `Text: {text}

If the text is in English and needs a summary, choose 'summarize'. 
If the text is not in English, choose 'translate'. 

Return as JSON with escaped braces: {{ "destination": "<chain>", "next_inputs": {{ "text": "{text}" }} }}`,
  ],
])

// Create LLMRouterChain
const routerChain = LLMRouterChain.fromLLM(llm, routerPrompt)

// 4️⃣ Combine with MultiRouteChain
const multiRouteChain = new MultiRouteChain({
  routerChain,
  destinationChains: {
    summarize: summarizerChain,
    translate: translatorChain,
  },
  defaultChain: summarizerChain,
})

// 5️⃣ Run demo
async function runRouterDemo() {
  const inputText1 = 'LangChain simplifies creating apps using LLMs.'
  const inputText2 = "Bonjour, comment ça va aujourd'hui?"

  console.log('=== Input 1 ===')
  const result1 = await multiRouteChain.call({ text: inputText1 })
  console.log('---- Result 1 -----', result1)

  console.log('=== Input 2 ===')
  console.log(await multiRouteChain.call({ text: inputText2 }))
}

runRouterDemo().catch(console.error)
*/

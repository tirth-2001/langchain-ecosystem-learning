import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 1. State definition
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  plan: Annotation<string | null>(),
  output: Annotation<string | null>(),
})

/**
 * 2. LLM setup
 */
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.4,
})

/**
 * 3. Planner Agent
 */
const plannerPrompt = ChatPromptTemplate.fromTemplate(`
You are a planning agent.
Extract the actions from the given user input and generate a plan for executing the actions.
User input: "{input}"
Be short and actionable.
`)

const plannerChain = RunnableSequence.from([plannerPrompt, llm, (out) => out.content.trim()])

async function plannerNode(state: typeof StateAnnotation.State) {
  console.log('🧠 Planner received:', state.input)
  const plan = await plannerChain.invoke({ input: state.input })
  console.log('📋 Generated plan:', plan)
  return { plan }
}

/**
 * 4. Executor Agent
 */
const executorPrompt = ChatPromptTemplate.fromTemplate(`
Execute this instruction:
"{plan}"

Input: "{input}"

Return ONLY the result.
`)

const executorChain = RunnableSequence.from([executorPrompt, llm, (out) => out.content.trim()])

async function executorNode(state: typeof StateAnnotation.State) {
  console.log('⚙️ Executor executing:', state.plan)
  const output = await executorChain.invoke({ plan: state.plan, input: state.input })
  console.log('🟢 Executor result:', output)
  return { output }
}

/**
 * 5. Build Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('planner', plannerNode)
  .addNode('executor', executorNode)
  .addEdge(START, 'planner')
  .addEdge('planner', 'executor')
  .addEdge('executor', END)

const app = workflow.compile()

/**
 * 6. Demo
 */
async function main() {
  const result = await app.invoke({
    input:
      'Summarize this text and extract keywords: A Real Estate Investment Trust (REIT) is a company that owns, manages, or finances income-producing real estate, such as office buildings, shopping malls, apartments, and warehouses. REITs allow individuals to invest in real estate portfolios without the need to buy or manage physical properties, similar to how mutual funds work by pooling money from multiple investors. Investors receive income from the properties through dividends, and many REITs are publicly traded on stock exchanges, providing liquidity.',
  })

  console.log('\n🚀 Final Output:', result.output)
}

main().catch(console.error)

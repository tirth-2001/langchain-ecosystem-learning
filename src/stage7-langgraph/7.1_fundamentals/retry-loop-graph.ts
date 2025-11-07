import { StateGraph, Annotation, END } from '@langchain/langgraph'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * Constants
 */
const MAX_ITERATIONS = 5

/**
 * 1️⃣ Define State
 */
const StateAnnotation = Annotation.Root({
  goal: Annotation<string>(),
  step: Annotation<string>(),
  result: Annotation<string>(),
  done: Annotation<boolean>(),
  completedSteps: Annotation<string[]>({
    reducer: (current, update) => [...(current || []), ...(update || [])], // Append completed steps
  }),
  iterations: Annotation<number>({
    reducer: (current, update) => (current || 0) + update, // Accumulate iterations
  }),
})

/**
 * 2️⃣ Define Models
 */
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.5,
})

/**
 * 3️⃣ Planner Node → decides next step
 */
const plannerPrompt = ChatPromptTemplate.fromTemplate(`
You are a task planner working towards a goal: "{goal}".

Completed steps so far:
{completedSteps}

Based on the completed steps above, suggest the NEXT step to continue towards the goal.
- If the goal is achieved, reply ONLY with: DONE
- Otherwise, reply with one actionable next step that hasn't been done yet.
- Do NOT repeat steps that are already completed.
`)

const plannerChain = RunnableSequence.from([plannerPrompt, model, (output) => output.content.trim()])

async function plannerNode(state: typeof StateAnnotation.State) {
  const completedStepsText =
    (state.completedSteps || []).length > 0
      ? (state.completedSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')
      : 'None yet'

  const nextStep = await plannerChain.invoke({
    goal: state.goal,
    completedSteps: completedStepsText,
  })
  if (nextStep.toUpperCase() === 'DONE') {
    return { done: true }
  }
  console.log('🧠 Planning next step:', nextStep)
  // Return step and increment (reducer handles accumulation)
  return { step: nextStep, iterations: 1 }
}

/**
 * 4️⃣ Worker Node → executes the step (simulation)
 */
async function workerNode(state: typeof StateAnnotation.State) {
  const step = state.step
  if (!step) {
    console.warn('⚠️ Worker: No step provided')
    return { result: 'No step to execute' }
  }
  const simulatedResult = `✅ Executed step: ${step}`
  console.log('⚙️ Worker executing:', simulatedResult)
  // Track completed step and return result
  return { result: simulatedResult, completedSteps: [step] }
}

/**
 * 5️⃣ Checker Node → decides if loop should continue
 */
const checkerPrompt = ChatPromptTemplate.fromTemplate(`
You are a checker evaluating progress towards a goal.

Goal: "{goal}"

Completed steps:
{completedSteps}

Last result: "{result}"

Based on the goal and all completed steps, decide if the goal is achieved.
- If the goal is fully achieved, reply: done
- If more steps are needed, reply: not_done

Reply with only: done or not_done
`)

const checkerChain = RunnableSequence.from([checkerPrompt, model, (output) => output.content.trim().toLowerCase()])

async function checkerNode(state: typeof StateAnnotation.State) {
  if (!state.result) {
    console.warn('⚠️ Checker: No result to check')
    return { done: false }
  }
  const completedStepsText =
    (state.completedSteps || []).length > 0
      ? (state.completedSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')
      : 'None yet'

  const verdict = await checkerChain.invoke({
    goal: state.goal,
    completedSteps: completedStepsText,
    result: state.result,
  })
  console.log('🧩 Checker verdict:', verdict)
  return { done: verdict === 'done' }
}

/**
 * 6️⃣ Build Graph with Looping Edge
 */
const graph = new StateGraph(StateAnnotation)
  .addNode('planner', plannerNode)
  .addNode('worker', workerNode)
  .addNode('checker', checkerNode)
  .addEdge('__start__', 'planner')
  .addEdge('planner', 'worker')
  .addEdge('worker', 'checker')
  .addConditionalEdges(
    'checker',
    (state) => {
      if (state.done) return 'done'
      if ((state.iterations ?? 0) >= MAX_ITERATIONS) return 'max_retries'
      return 'continue'
    },
    {
      done: END,
      continue: 'planner',
      max_retries: END,
    },
  )

const app = graph.compile()

/**
 * 7️⃣ Run Demo
 */
async function main() {
  console.log('🧭 Starting Looping Graph Demo...\n')

  const result = await app.invoke({
    goal: 'Write a 3-step plan to organize my morning routine.',
  })

  console.log('\n🏁 Final State:')
  console.log(result)
}

main()

import 'dotenv/config'
import { Annotation, StateGraph, START, END, MemorySaver, interrupt, Command } from '@langchain/langgraph'

import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'

/* ------------------------------
   Config
   ------------------------------ */
const MAX_ITERATIONS = 8
const THREAD_ID_PREFIX = 'longrun-'

/* ------------------------------
   State
   ------------------------------ */
const StateAnnotation = Annotation.Root({
  goal: Annotation<string>(),
  completedSteps: Annotation<string[]>({
    reducer: (curr, update) => [...(curr ?? []), ...(update ?? [])],
  }),
  currentStep: Annotation<string | null>({ reducer: (_c, u) => u ?? _c }),
  result: Annotation<string | null>({ reducer: (_c, u) => u ?? _c }),
  done: Annotation<boolean>({ reducer: (_c, u) => (u === undefined ? _c : u) }),
  iterations: Annotation<number>({
    reducer: (curr, update) => (curr ?? 0) + (update ?? 0),
  }),
  timeStarted: Annotation<string | null>({ reducer: (_c, u) => u ?? _c }),
  lastHeartbeat: Annotation<string | null>({ reducer: (_c, u) => u ?? _c }),
})

/* ------------------------------
   LLMs & Chains
   ------------------------------ */
const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.3 })

/* Planner: propose ONE next step or write DONE */
const plannerPrompt = ChatPromptTemplate.fromTemplate(`
You are a task planner. Goal: "{goal}"

Completed steps:
{completed}

Return either:
- DONE  (if goal is achieved) OR
- A single short actionable step (one or two sentences) to progress toward the goal.

Do not include numbering. Keep it one line.
`)
const plannerChain = RunnableSequence.from([plannerPrompt, llm, (o) => o.content.trim()])

/* Worker: execute the step (can be LLM-based or call tools) */
const workerPrompt = ChatPromptTemplate.fromTemplate(`
You are an executor. Perform this step:
"{step}"

Return a concise result of the execution (one or two lines).
If this requires human approval, return a result that contains the token ESCALATE in uppercase.
`)
const workerChain = RunnableSequence.from([workerPrompt, llm, (o) => o.content.trim()])

/* Checker: see if goal is achieved given completed steps */
const checkerPrompt = ChatPromptTemplate.fromTemplate(`
You are an evaluator. Goal: "{goal}"

Completed steps:
{completed}

Based on the completed steps above and the last result, decide if the goal is achieved.

If achieved, reply with DONE. Otherwise reply with NOT_DONE.
`)
const checkerChain = RunnableSequence.from([checkerPrompt, llm, (o) => o.content.trim().toUpperCase()])

/* ------------------------------
   Nodes
   ------------------------------ */

/* Planner Node */
async function plannerNode(state: typeof StateAnnotation.State) {
  // set timeStarted on first run
  if (!state.timeStarted) {
    const now = new Date().toISOString()
    return { timeStarted: now, iterations: 0, currentStep: null } // ensure timeStarted set; actual planning below
  }

  const completedText = (state.completedSteps || []).join('\n') || 'None yet'
  const plan = await plannerChain.invoke({ goal: state.goal, completed: completedText })

  if (!plan) return { currentStep: null }
  if (plan.trim().toUpperCase() === 'DONE') {
    return { done: true }
  }
  // Increment iterations by 1 (reducer adds it)
  return { currentStep: plan, iterations: 1 }
}

/* Worker Node: includes heartbeat & optional interrupt for HITL */
async function workerNode(state: typeof StateAnnotation.State) {
  // heartbeat update
  const heartbeat = new Date().toISOString()

  // Example: if step includes the word "HUMAN_APPROVAL", we will pause
  if (state.currentStep?.includes('HUMAN_APPROVAL')) {
    console.log('Worker: pausing for human approval via interrupt()')
    // interrupt(payload) will pause and return resumed value when resumed.
    const feedback = interrupt({
      prompt: "This step requires human approval. Provide 'APPROVE' or 'REJECT'.",
      data: { step: state.currentStep },
    })
    // after resume, feedback will be the provided value
    console.log('Worker resumed with feedback:', feedback)
    // incorporate feedback into result
    const finalResult = `Human feedback: ${feedback}`
    return { result: finalResult, completedSteps: [state.currentStep ?? ''], lastHeartbeat: heartbeat }
  }

  // Normal worker execution
  const output = await workerChain.invoke({ step: state.currentStep ?? '' })

  const needsEsc = output.toUpperCase().includes('ESCALATE')
  if (needsEsc) {
    // signal escalation by setting done=false and a flag via result text
    return { result: output, completedSteps: [state.currentStep ?? ''], lastHeartbeat: heartbeat }
  }

  return { result: output, completedSteps: [state.currentStep ?? ''], lastHeartbeat: heartbeat }
}

/* Checker Node */
async function checkerNode(state: typeof StateAnnotation.State) {
  // Safety: if iterations exceed max, force stop
  if ((state.iterations ?? 0) >= MAX_ITERATIONS) {
    return { done: true }
  }

  const completedText = (state.completedSteps || []).join('\n') || 'None yet'
  const verdict = await checkerChain.invoke({ goal: state.goal, completed: completedText })

  if (verdict === 'DONE') return { done: true }
  return { done: false }
}

/* Heartbeat Node (optional; can be used to update heartbeat if you want a separate node) */
async function heartbeatNode(_state: typeof StateAnnotation.State) {
  return { lastHeartbeat: new Date().toISOString() }
}

/* ------------------------------
   Graph wiring and guards
   ------------------------------ */
const graph = new StateGraph(StateAnnotation)
  .addNode('planner', plannerNode)
  .addNode('worker', workerNode)
  .addNode('checker', checkerNode)
  // .addNode('heartbeat', heartbeatNode)
  .addEdge(START, 'planner')
  .addEdge('planner', 'worker')
  .addEdge('worker', 'checker')
  // If checker says done -> END; otherwise go to planner for next iteration
  .addConditionalEdges('checker', (state) => (state.done ? 'done' : 'continue'), { done: END, continue: 'planner' })

/* ------------------------------
   Checkpointer (MemorySaver) and compile
   ------------------------------ */
/**
 * NOTE: MemorySaver is in-memory by default in some builds.
 * For production, replace MemorySaver with a persistent implementation:
 * - Mongo-backed checkpointer: store state object per thread_id
 * - Redis-backed checkpointer: store serialized state
 *
 * The API here assumes `new MemorySaver()` works; adjust import path as needed.
 */
const checkpointer = new MemorySaver()
const app = graph.compile({ checkpointer })

/* ------------------------------
   Runner helpers: startTask, resumeTask, getStatus
   ------------------------------ */

// Start a long-running task; threadId should be unique per task (persist in DB)
async function startTask(goal: string, threadId: string) {
  // use a stable thread id so state persists
  const config = { configurable: { thread_id: threadId } }

  // invoke will run until the graph finishes or an interrupt occurs
  const result = await app.invoke({ goal }, config)
  return result
}

// Resume a paused task using Command.resume (value passed will be returned by interrupt())
async function resumeTask(threadId: string, resumeValue: any) {
  const config = { configurable: { thread_id: threadId } }
  // pass Command with resume
  const result = await app.invoke(new Command({ resume: resumeValue }), config)
  return result
}

// Read status from checkpointer (MemorySaver direct access)
// For production, read from DB checkpointer instead
async function readCheckpoint(threadId: string) {
  try {
    // MemorySaver shape depends on version. Many implementations expose get() or similar
    // If unavailable, store the state externally when nodes run (logger/db).
    // Here we attempt a best-effort: try app.getState or checkpointer.getState
    // (This is pseudo; adapt to your checkpointer API.)
    // return await checkpointer.get(threadId);
    return { note: 'Replace with your checkpointer read logic' }
  } catch (err) {
    return { error: String(err) }
  }
}

/* ------------------------------
   Demo usage (start -> possibly resume)
   ------------------------------ */
async function demo() {
  const threadId = THREAD_ID_PREFIX + Date.now()
  console.log('Starting long-run task with threadId:', threadId)

  // Kick off in background (do not await if you want concurrent control).
  // Here we await to show a simple demo; in practice you may run this in a worker/process.
  const runPromise = startTask('Plan a 3-item morning routine for improved productivity.', threadId)
    .then((res) => {
      console.log('Task finished/resolved:', res)
    })
    .catch((err) => {
      console.error('Task run error:', err)
    })

  // Simulated external monitor: poll every 10s to show status (demo)
  let checks = 0
  const pollInterval = setInterval(async () => {
    checks++
    console.log(`[monitor] poll #${checks} for thread ${threadId}`)
    const cp = await readCheckpoint(threadId)
    console.log('[monitor] checkpoint (demo):', cp)
    // Stop after a few polls in demo
    if (checks >= 3) {
      clearInterval(pollInterval)
    }
  }, 10_000)

  // Wait for run to finish in demo
  await runPromise
}

demo().catch(console.error)

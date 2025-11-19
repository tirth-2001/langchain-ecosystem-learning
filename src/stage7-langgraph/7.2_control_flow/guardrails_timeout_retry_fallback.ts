/**
 * Stage 7 – LangGraph Control Flow: Advanced Guardrails
 * Micro-project: Building resilient graphs with timeouts and retries
 *
 * Objectives:
 * 1. Implement strict timeouts for LLM calls to prevent hanging
 * 2. Combine retries with timeouts for maximum reliability
 * 3. Use guardrails to validate outputs and trigger fallbacks
 *
 * Core Concepts Covered:
 * - Timeouts: Using `Promise.race` to enforce time limits
 * - Resilience: Layering retries and timeouts
 * - Guardrails: Validating results before proceeding
 * - Fallback Strategies: Graceful degradation when primary paths fail
 */

import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import 'dotenv/config'

/**
 * 1) State model
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  ok: Annotation<boolean>(),
  result: Annotation<string>(),
  error: Annotation<string>(),
  final: Annotation<string>(),
})

/**
 * 2) Helpers
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), ms)),
  ])
}

async function retry<T>(fn: () => Promise<T>, attempts = 2, delay = 300): Promise<T> {
  let lastError: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

/**
 * 3) Nodes
 */
const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.4 })

async function riskyLLMNode(state: typeof StateAnnotation.State) {
  console.log('😬 riskyLLMNode running…')

  const runModel = async () => {
    const out = await llm.invoke([['user', `Respond in 20 words: ${state.input}`]])
    return out.content.toString().trim()
  }

  try {
    const result = await withTimeout(
      retry(runModel, 2),
      1500, // 1.5s timeout
    )

    return { ok: true, result }
  } catch (err: any) {
    console.log('❌ riskyLLMNode failed:', err.message)
    return { ok: false, error: err.message }
  }
}

async function successNode(state: typeof StateAnnotation.State) {
  console.log('✅ Success path')
  return { final: `✅ Success: ${state.result}` }
}

async function fallbackNode(state: typeof StateAnnotation.State) {
  console.log('⚠️ Fallback path')
  return { final: `⚠️ Fallback: ${state.error}` }
}

async function mergeNode(state: typeof StateAnnotation.State) {
  return state
}

/**
 * 4) Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('riskyLLMNode', riskyLLMNode)
  .addNode('successNode', successNode)
  .addNode('fallbackNode', fallbackNode)
  .addNode('mergeNode', mergeNode)
  .addEdge(START, 'riskyLLMNode')
  .addConditionalEdges('riskyLLMNode', (state) => (state.ok ? 'ok' : 'fail'), {
    ok: 'successNode',
    fail: 'fallbackNode',
  })
  .addEdge('successNode', 'mergeNode')
  .addEdge('fallbackNode', 'mergeNode')
  .addEdge('mergeNode', END)

const app = workflow.compile()

/**
 * 5) Demo
 */
async function main() {
  console.log('\n=== Timeout & Guardrail Demo ===\n')

  const result = await app.invoke({
    input: 'Explain quantum gravity in one sentence.',
  })

  console.log('\n✅ Final Output:', result.final)
}

main().catch(console.error)

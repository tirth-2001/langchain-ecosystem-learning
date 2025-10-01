/**
 * src/stage2-core-modules/chains/custom-chain-LCEL.ts
 *
 * Smart Assistant Pipeline:
 * Input: query
 * Step 1 → Preprocess (trim/normalize input)
 * Step 2 → Branch (math vs text vs default)
 * Step 3 → Inside text path → run parallel analysis (summary + sentiment)
 * Step 4 → Add fallback LLM in case one fails
 * Step 5 → Post-process output (cleanup JSON)
 */

/**
🧩 How it Works
1. Preprocess → clean query

2. Router (branching) →

Math problems → mathChain (with fallback)
Long text → textAnalysisChain (parallel summary + sentiment)
Else → generalChain

3. Post-process → normalizes output into clean JSON
---
✅ Sample Outputs
--- Math Example ---
{ answer: '100' }

--- Text Example ---
{ summary: 'The movie was enjoyable but had a sad ending.', sentiment: 'negative' }

--- General Example ---
{ answer: 'The current president of the United States is Joe Biden.' }
---
💡 This one file combines everything:
- Sequential pipeline
- Branching logic
- Parallel fan-out
- Fallback models
- Custom post-processing
*/
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence, RunnableParallel, RunnableBranch } from '@langchain/core/runnables'

// ---------- LLMs ----------
const primaryLLM = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })
const backupLLM = new ChatOpenAI({ modelName: 'gpt-3.5-turbo', temperature: 0 })

// Common routed output type for all branches
type RoutedOutput = {
  answer?: string
  summary?: string
  sentiment?: string
}

// ---------- Prompts ----------
const mathPrompt = PromptTemplate.fromTemplate('Solve this math problem: {query}')
const summaryPrompt = PromptTemplate.fromTemplate('Summarize this text in 1 sentence: {query}')
const sentimentPrompt = PromptTemplate.fromTemplate('What is the sentiment (positive/negative): {query}')
const generalPrompt = PromptTemplate.fromTemplate('Be a helpful assistant. Answer clearly in 5 bullet points: {query}')

// ---------- Destination Chains ----------
const mathChain = mathPrompt.pipe(primaryLLM.withFallbacks({ fallbacks: [backupLLM] }))
const generalChain = generalPrompt.pipe(primaryLLM)

// Text analysis branch → runs multiple tasks in parallel
const textAnalysisChain = RunnableParallel.from({
  summary: summaryPrompt.pipe(primaryLLM),
  sentiment: sentimentPrompt.pipe(primaryLLM),
})

// Normalize branch outputs so the router has a consistent output type
const mathChainNormalized = mathChain.pipe((msg: any): RoutedOutput => ({ answer: msg?.content ?? String(msg) }))
const generalChainNormalized = generalChain.pipe((msg: any): RoutedOutput => ({ answer: msg?.content ?? String(msg) }))
const textAnalysisNormalized = textAnalysisChain.pipe(
  (res: any): RoutedOutput => ({
    summary: res?.summary?.content ?? res?.summary,
    sentiment: res?.sentiment?.content ?? res?.sentiment,
  }),
)

// ---------- Branching Logic ----------
const router = RunnableBranch.from<{ query: string }, RoutedOutput>([
  // If query includes numbers → treat as math
  [(input: { query: string }) => /\d+/.test(input.query), mathChainNormalized],

  // If query looks like text/story → run parallel analysis
  [(input: { query: string }) => input.query.length > 20, textAnalysisNormalized],

  // Default → general Q&A (no predicate here per signature)
  generalChainNormalized,
])

// ---------- Final Pipeline ----------
const fullChain = RunnableSequence.from([
  // Preprocessing step (same as Lanchain native TransformChain)
  (input: { query: string }) => ({ query: input.query.trim().toLowerCase() }),

  // Route query
  router,

  // Post-process step
  async (result) => {
    if (typeof result === 'string') return { answer: result }
    if (result?.summary && result?.sentiment) {
      return {
        summary: result.summary.content ?? result.summary,
        sentiment: result.sentiment.content ?? result.sentiment,
      }
    }
    if (result?.content) return { answer: result.content }
    return { answer: result }
  },
])

// ---------- Run Demo ----------
async function runDemo() {
  console.log('\n--- Math Example ---')
  const mathRes = await fullChain.invoke({ query: 'What is 25 * 4?' })
  console.log(mathRes)

  console.log('\n--- Text Example ---')
  const textRes = await fullChain.invoke({ query: 'I really enjoyed the movie but the ending made me cry.' })
  console.log(textRes)

  console.log('\n--- General Example ---')
  const generalRes = await fullChain.invoke({ query: 'History of India' })
  console.log(generalRes)
}

runDemo().catch(console.log)

import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * Constants
 */
const MAX_ITERATIONS = 5 // Safety limit to prevent infinite loops

/**
 * 1. Shared State
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),

  research: Annotation<string[]>({
    reducer: (curr, update) => [...(curr ?? []), ...(update ?? [])],
  }),

  drafts: Annotation<string[]>({
    reducer: (curr, update) => [...(curr ?? []), ...(update ?? [])],
  }),

  feedback: Annotation<string[]>({
    reducer: (curr, update) => [...(curr ?? []), ...(update ?? [])],
  }),

  isComplete: Annotation<boolean>(),
})

/**
 * 2. Base Model
 */
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.4,
})

/**
 * 3. Researcher Node
 */
const researchPrompt = ChatPromptTemplate.fromTemplate(`
You are a RESEARCHER agent.
Provide structured notes for: "{input}"

Return ONLY bullet points.
`)

const researchChain = RunnableSequence.from([researchPrompt, llm, (o) => o.content.trim()])

async function researcherNode(state: typeof StateAnnotation.State) {
  console.log('🔍 Researcher analyzing...')
  const note = await researchChain.invoke({ input: state.input })
  console.log('🔍 Researcher output:', note)
  return { research: [note] }
}

/**
 * 4. Writer Node
 */
const writerPrompt = ChatPromptTemplate.fromTemplate(`
You are a WRITER agent.

Research notes:
{research}

Write 1 short paragraph using ONLY the research notes above.

Feedback instructions:
{feedbackInstruction}

{feedback}
`)

const writerChain = RunnableSequence.from([writerPrompt, llm, (o) => o.content.trim()])

async function writerNode(state: typeof StateAnnotation.State) {
  console.log('✍️ Writer composing...')
  const notes = state.research.join('\n')

  // Include latest feedback if available
  const latestFeedback =
    state?.feedback?.length > 0 ? `\n\nPrevious feedback:\n${state.feedback[state.feedback.length - 1]}` : ''

  const feedbackInstruction = latestFeedback ? 'Use the previous feedback to improve your writing.' : ''

  const text = await writerChain.invoke({
    research: notes,
    feedback: latestFeedback,
    feedbackInstruction,
  })
  console.log('✍️ Writer output:', text)
  return { drafts: [text] }
}

/**
 * 5. Critic Node
 */
const criticPrompt = ChatPromptTemplate.fromTemplate(`
You are a CRITIC.
Give brief constructive feedback for this draft:

{draft}
`)

const criticChain = RunnableSequence.from([criticPrompt, llm, (o) => o.content.trim()])

async function criticNode(state: typeof StateAnnotation.State) {
  console.log('🧪 Critic reviewing...')
  const last = state.drafts[state.drafts.length - 1]
  const fb = await criticChain.invoke({ draft: last })
  console.log('🧪 Critic output:', fb)
  return { feedback: [fb] }
}

/**
 * 6. Verification Node
 */
const verificationPrompt = ChatPromptTemplate.fromTemplate(`
You are a VERIFIER agent.

Original research notes:
{research}

Latest draft:
{draft}

{previousFeedbackSection}

Latest critic feedback (for the latest draft above):
{latestFeedback}

Your task:
1. Check if the latest draft accurately uses information from the research notes
{previousFeedbackTask}
2. Check if the latest critic feedback indicates the draft is satisfactory. Look for positive indicators like "good", "well-written", "accurate", "satisfactory", "excellent", or if feedback only suggests minor improvements. If feedback indicates major issues or significant problems, it's not satisfactory.

Respond with ONLY one word: "complete" or "revise"
- "complete" if: draft matches research AND latest critic feedback is positive/satisfied{previousFeedbackComplete}
- "revise" if: draft doesn't match research OR latest critic feedback indicates significant issues{previousFeedbackRevise}
`)

const verificationChain = RunnableSequence.from([verificationPrompt, llm, (o) => o.content.trim().toLowerCase()])

async function verificationNode(state: typeof StateAnnotation.State) {
  console.log('✅ Verifier checking...')

  // Get latest values from arrays (shared memory pattern)
  const latestResearch = state.research[state.research.length - 1]
  const latestDraft = state.drafts[state.drafts.length - 1]
  const latestFeedback = state.feedback[state.feedback.length - 1]

  // Check if there's previous feedback (from previous iteration)
  // On first iteration: drafts.length = 1, feedback.length = 1 (no previous feedback)
  // On subsequent iterations: drafts.length = N, feedback.length = N (previous feedback is feedback[N-2])
  const hasPreviousFeedback = state.feedback.length > 1
  const previousFeedback = hasPreviousFeedback ? state.feedback[state.feedback.length - 2] : null

  const previousFeedbackSection = previousFeedback
    ? `Previous feedback (that the writer should have addressed in the latest draft):\n${previousFeedback}\n\n`
    : ''

  const previousFeedbackTask = previousFeedback
    ? 'Check if the latest draft addresses the previous feedback above.\n'
    : ''

  const previousFeedbackComplete = previousFeedback ? ' AND the draft addresses the previous feedback' : ''

  const previousFeedbackRevise = previousFeedback ? " OR the draft doesn't address the previous feedback" : ''

  const verdict = await verificationChain.invoke({
    research: latestResearch,
    draft: latestDraft,
    previousFeedbackSection,
    latestFeedback,
    previousFeedbackTask,
    previousFeedbackComplete,
    previousFeedbackRevise,
  })

  const isComplete = verdict.includes('complete')
  console.log(`✅ Verifier verdict: ${verdict} (${isComplete ? 'COMPLETE' : 'NEEDS REVISION'})`)

  return { isComplete }
}

/**
 * 7. Build Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('researcher', researcherNode)
  .addNode('writer', writerNode)
  .addNode('critic', criticNode)
  .addNode('verifier', verificationNode)
  .addEdge(START, 'researcher')
  .addEdge('researcher', 'writer')
  .addEdge('writer', 'critic')
  .addEdge('critic', 'verifier')
  .addConditionalEdges(
    'verifier',
    (state) => {
      // Safety check: prevent infinite loops
      const iterationCount = state.drafts.length
      if (iterationCount >= MAX_ITERATIONS) {
        console.log(`⚠️ Max iterations (${MAX_ITERATIONS}) reached. Stopping.`)
        return 'done'
      }
      return state.isComplete ? 'done' : 'revise'
    },
    {
      done: END,
      revise: 'writer',
    },
  )

const app = workflow.compile()

/**
 * 8. Demo
 */
async function main() {
  const result = await app.invoke({
    input: 'Explain how LangGraph improves agent reliability.',
  })

  console.log('\n🔍 RESEARCH NOTES:')
  console.log(result.research[result.research.length - 1])

  console.log('\n✍️ DRAFT:')
  console.log(result.drafts[result.drafts.length - 1])

  console.log('\n🧪 FEEDBACK:')
  console.log(result.feedback[result.feedback.length - 1])
}

main().catch(console.error)

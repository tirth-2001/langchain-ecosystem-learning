import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 1️⃣ State Model
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  toolResult: Annotation<string>({
    reducer: (curr, next) => next ?? curr,
  }),
  answer: Annotation<string>({
    reducer: (curr, next) => next ?? curr,
  }),
})

/**
 * 2️⃣ Internal Calculator Tool (Demo Only)
 */
function calculatorTool(expression: string): number | null {
  try {
    // Very naive sanitizer: allow digits, operators, parentheses, spaces, and dots
    const safeExpr = expression.replace(/[^0-9+\-*/().\s]/g, '')
    // ⚠️ Do NOT use eval in production. Use a math parser instead.
    // eslint-disable-next-line no-eval
    const result = eval(safeExpr)
    if (typeof result === 'number' && Number.isFinite(result)) {
      return result
    }
    return null
  } catch {
    return null
  }
}

/**
 * 3️⃣ Nodes
 */

// Tool Node: calls calculatorTool
async function calculatorNode(state: typeof StateAnnotation.State) {
  console.log('🧮 calculatorNode: evaluating expression:', state.input)

  const result = calculatorTool(state.input)
  if (result === null) {
    return { toolResult: 'Error: could not compute expression.' }
  }

  return { toolResult: result.toString() }
}

// LLM Answer Node
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
})

const answerPrompt = ChatPromptTemplate.fromTemplate(`
You are a helpful assistant.

The user asked:
{input}

A calculator tool produced this result:
{toolResult}

If the tool result is calculated correctly, acknowledge the tool for the answer and say the result.
Else, say that the tool result is incorrect and explain the correct result.

Explain the result briefly to the user in a clear, friendly way.
`)

const answerChain = RunnableSequence.from([answerPrompt, model, (out) => out.content.trim()])

async function answerNode(state: typeof StateAnnotation.State) {
  console.log('💬 answerNode: formatting final response...')

  const answer = await answerChain.invoke({
    input: state.input,
    toolResult: state.toolResult,
  })

  return { answer }
}

/**
 * 4️⃣ Graph Definition
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('calculatorNode', calculatorNode)
  .addNode('answerNode', answerNode)
  .addEdge(START, 'calculatorNode')
  .addEdge('calculatorNode', 'answerNode')
  .addEdge('answerNode', END)

const app = workflow.compile()

/**
 * 5️⃣ Demo Runner
 */
async function main() {
  console.log('\n=== 7.4.1 — Tool Node (Calculator) Demo ===\n')

  const queries = [
    '12 * (8 + 2)',
    '100 / 4 + 7 * 3',
    '2.5 * 3.6',
    'hello world', // invalid
  ]

  for (const input of queries) {
    console.log(`\n👤 User: ${input}`)
    const result = await app.invoke({ input })
    console.log('🧮 Tool Result:', result.toolResult)
    console.log('🤖 Final Answer:', result.answer)
  }
}

main().catch(console.error)

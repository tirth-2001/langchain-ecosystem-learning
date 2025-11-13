import { Annotation, StateGraph, END, START, Command } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 1) State model
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  summary: Annotation<string>({
    reducer: (curr, next) => next ?? curr,
  }),
  keywords: Annotation<string[]>({
    reducer: (curr, next) => [...(curr ?? []), ...(next ?? [])],
  }),
  combined: Annotation<string>({
    reducer: (curr, next) => next ?? curr,
  }),
})

/**
 * 2) LLM setup
 */
const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.2 })

const summarizePrompt = ChatPromptTemplate.fromTemplate(
  `Summarize the following text in one concise sentence:\n\n{text}`,
)
const summarizeChain = RunnableSequence.from([summarizePrompt, model, (out) => out.content.trim()])

const keywordsPrompt = ChatPromptTemplate.fromTemplate(
  `Extract 5-8 keywords as a comma separated list of strings.\n\nText:\n{text}`,
)
const keywordsChain = RunnableSequence.from([
  keywordsPrompt,
  model,
  (out) => {
    try {
      return JSON.parse(out.content.trim())
    } catch {
      return [out.content.trim()]
    }
  },
])

/**
 * 3) Nodes
 */
function fanOutNode() {
  return new Command({
    goto: ['summarizeNode', 'keywordsNode'],
  })
}

async function summarizeNode(state: typeof StateAnnotation.State) {
  console.log('📝 summarizeNode running…')
  const summary = await summarizeChain.invoke({ text: state.input })
  return { summary }
}

async function keywordsNode(state: typeof StateAnnotation.State) {
  console.log('🔎 keywordsNode running…')
  const kw = await keywordsChain.invoke({ text: state.input })
  return { keywords: kw }
}

async function joinNode(state: typeof StateAnnotation.State) {
  console.log('🤝 joinNode combining results…')
  return {
    combined: `Summary: ${state.summary}\nKeywords: ${state.keywords.join(', ')}`,
  }
}

/**
 * 4) Build graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('fanOut', fanOutNode, { ends: ['summarizeNode', 'keywordsNode'] })
  .addNode('summarizeNode', summarizeNode)
  .addNode('keywordsNode', keywordsNode)
  .addNode('join', joinNode)
  .addEdge(START, 'fanOut')
  .addEdge('summarizeNode', 'join')
  .addEdge('keywordsNode', 'join')
  .addEdge('join', END)

const app = workflow.compile()

/**
 * 5) Demo
 */
async function main() {
  console.log('\n=== 7.2.4 Parallel Execution Demo ===\n')

  const text =
    'A REIT, or Real Estate Investment Trust, is a company that owns, operates, or finances income-producing real estate, allowing individuals to invest in large-scale properties without buying them directly. REITs are similar to mutual funds in that they pool money from many investors, and their shares are traded on major stock exchanges, making them liquid and easy to buy and sell. Investors can earn income from dividends, which are often paid out from rental income, and from potential capital appreciation.'

  const result = await app.invoke({ input: text })

  console.log('\n✅ FINAL STATE:')
  console.log({
    summary: result.summary,
    keywords: result.keywords,
    combined: result.combined,
  })
}

main().catch(console.error)

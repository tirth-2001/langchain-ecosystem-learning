import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

/**
 * 1. State
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  research: Annotation<string | null>(),
  article: Annotation<string | null>(),
})

/**
 * 2. LLM
 */
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.4,
})

/**
 * 3. Researcher Agent
 */
const researchPrompt = ChatPromptTemplate.fromTemplate(`
You are a RESEARCHER agent.

Analyze the user's request:
"{input}"

Produce structured research notes:
- Key facts
- Bullet points
- Important details
- No storytelling

Return ONLY research notes.
`)

const researchChain = RunnableSequence.from([researchPrompt, llm, (out) => out.content.trim()])

async function researcherNode(state: typeof StateAnnotation.State) {
  console.log('🔍 Researcher analyzing...')
  const research = await researchChain.invoke({ input: state.input })
  console.log('🔍 Researcher output:', research)
  return { research }
}

/**
 * 4. Writer Agent
 */
const writerPrompt = ChatPromptTemplate.fromTemplate(`
You are a WRITER agent.

Using this research:
{research}

Produce a well-written article with:
- Headings
- Sections
- Bullet points
- No hallucinations
- Based ONLY on research provided

Return ONLY the article.
`)

const writerChain = RunnableSequence.from([writerPrompt, llm, (out) => out.content.trim()])

async function writerNode(state: typeof StateAnnotation.State) {
  console.log('✍️ Writer composing...')
  const article = await writerChain.invoke({ research: state.research })
  console.log('🔍 Writer output:', article)
  return { article }
}

/**
 * 5. Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('researcher', researcherNode)
  .addNode('writer', writerNode)
  .addEdge(START, 'researcher')
  .addEdge('researcher', 'writer')
  .addEdge('writer', END)

const app = workflow.compile()

/**
 * 6. Demo
 */
async function main() {
  const result = await app.invoke({
    input: 'Write a blog about how LangGraph improves agent workflow reliability.',
  })

  console.log('\n📝 FINAL ARTICLE:\n')
  console.log(result.article)
}

main().catch(console.error)

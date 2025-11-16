import { Annotation, StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import 'dotenv/config'

// -------------------------------
// 1️⃣ State Model with Reducers
// -------------------------------

const StateAnnotation = Annotation.Root({
  input: Annotation<string>(),
  chatHistory: Annotation<string[]>({
    reducer: (curr, next) => [...(curr ?? []), ...(next ?? [])],
  }),
  summary: Annotation<string>({
    reducer: (curr, next) => next ?? curr,
  }),
  retrievedDocs: Annotation<string[]>({
    reducer: (curr, next) => [...(curr ?? []), ...(next ?? [])],
  }),
  answer: Annotation<string>(),
  done: Annotation<boolean>({
    reducer: (_, next) => next,
  }),
})

// ----------------------------
// 2️⃣ LLM Setup
// ----------------------------

const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.3,
})

// ----------------------------
// 3️⃣ Prompts & Chains
// ----------------------------

// Format chat history during inference
const formatHistory = (history?: string[]) => (history ?? []).join('\n')

// Summarizer prompt
const summaryPrompt = ChatPromptTemplate.fromTemplate(`
Summarize this conversation into a concise form:

Chat History:
{history}

Existing Summary:
{summary}

Return the improved summary only.
`)

const summaryChain = RunnableSequence.from([summaryPrompt, model, (out) => out.content.trim()])

// Mock RAG function — Replace with real vector store later
async function mockRetrieve(query: string) {
  return [`📄 Mock doc snippet relevant to: "${query}"`, `📄 Additional hint for processing query: "${query}"`]
}

// Answer generation prompt
const answerPrompt = ChatPromptTemplate.fromTemplate(`
You are an advanced AI assistant.

Use:
1. Conversation Summary: {summary}
2. Query: {input}
3. Relevant Docs: {retrieved}

Respond clearly. At end add tag:
- "ANSWER_READY" if final answer
- "NEED_MORE_INFO" if user must clarify
`)

const answerChain = RunnableSequence.from([answerPrompt, model, (out) => out.content.trim()])

// ---------------------------------
// 4️⃣ Node Implementations
// ---------------------------------

async function memoryNode(state: typeof StateAnnotation.State) {
  return { chatHistory: [`Human: ${state.input}`] }
}

async function summarizerNode(state: typeof StateAnnotation.State) {
  const history = formatHistory(state.chatHistory)
  const newSummary = await summaryChain.invoke({
    history,
    summary: state.summary ?? '',
  })
  return { summary: newSummary }
}

async function ragNode(state: typeof StateAnnotation.State) {
  const docs = await mockRetrieve(state.input)
  return { retrievedDocs: docs }
}

async function answerNode(state: typeof StateAnnotation.State) {
  const answer = await answerChain.invoke({
    summary: state.summary ?? '',
    input: state.input,
    retrieved: (state.retrievedDocs ?? []).join('\n'),
  })
  return { answer }
}

async function checkerNode(state: typeof StateAnnotation.State) {
  if (state.answer?.includes('ANSWER_READY')) {
    return { done: true }
  }
  return { done: false }
}

// ---------------------------------
// 5️⃣ Graph Definition
// ---------------------------------

const workflow = new StateGraph(StateAnnotation)
  .addNode('memory', memoryNode)
  .addNode('summarizer', summarizerNode)
  .addNode('retriever', ragNode)
  .addNode('answerNode', answerNode)
  .addNode('checker', checkerNode)
  .addEdge(START, 'memory')
  .addEdge('memory', 'summarizer')
  .addEdge('summarizer', 'retriever')
  .addEdge('retriever', 'answerNode')
  .addEdge('answerNode', 'checker')
  .addConditionalEdges(
    'checker',
    (state) => (state.done ? 'END' : 'memory'), // loop until done
    {
      END,
      memory: 'memory',
    },
  )

const app = workflow.compile()

// ---------------------------------
// 6️⃣ Demo Runner
// ---------------------------------

async function runDemo() {
  const input1 = 'What to do for more details on that person?'
  const res1 = await app.invoke({ input: input1 })
  console.log('\nAI:', res1.answer)

  const input2 = 'What should I do while driving at night?'
  const res2 = await app.invoke({
    input: input2,
    chatHistory: res1.chatHistory,
    summary: res1.summary,
  })

  console.log('\nAI:', res2.answer)
  console.log('\n🧠 Final Memory Summary:', res2.summary)
}

runDemo().catch(console.error)

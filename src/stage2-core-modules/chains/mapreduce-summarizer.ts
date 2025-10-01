/**
 * src/stage2-chains/mapreduce-summarizer.ts
 *
 * MapReduceDocumentsChain Demo:
 * - Split long text
 * - Summarize each chunk
 * - Reduce into final summary
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from '@langchain/core/documents'
import { loadSummarizationChain } from 'langchain/chains'

// 1. Initialize LLM
const llm = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
})

// 2. Example long text
const longText = `
LangChain is a framework designed to simplify working with large language models (LLMs).
It provides abstractions for prompts, chains, memory, agents, and tools. With LangChain,
developers can focus on building applications like chatbots, summarizers, RAG pipelines,
and autonomous agents. The ecosystem includes LangGraph for orchestration and LangSmith
for debugging and monitoring. By combining modular components, LangChain enables scalable
and production-grade AI apps. In this article, we will explore why LangChain exists,
its architecture, and real-world use cases...
`

// 3. Split into chunks
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 50,
})

// 4. Create MapReduce Chain
const summarizeChain = loadSummarizationChain(llm, {
  type: 'map_reduce',
})

// 5. Run
async function runDemo() {
  console.log('=== Running MapReduce Summarizer ===')
  const docs = await splitter.splitDocuments([new Document({ pageContent: longText })])

  const summary = await summarizeChain.invoke({ input_documents: docs })
  console.log('\n📌 Final Summary:\n', summary)
}

runDemo().catch(console.error)

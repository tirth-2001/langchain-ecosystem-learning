# 📖 Theory — MapReduceDocumentsChain

### 1. Problem

LLMs have **context length limits** (e.g., 4k, 8k tokens).
If you want to summarize a **long document** (e.g., a 100-page report), you can’t feed it directly into the LLM.

### 2. Solution: MapReduce

This follows the **classic MapReduce pattern**:

- **Map Step** → Split the document into smaller chunks → Summarize each chunk.
- **Reduce Step** → Combine the summaries into one final global summary.

This allows handling of **arbitrarily long documents** while staying within context limits.

### 3. Core Components

- **Document Loaders** → Bring in raw text (PDFs, web pages, Markdown, etc.).
- **Text Splitters** → Chunk long text (e.g., RecursiveCharacterTextSplitter).
- **Map Chain** → Prompt the LLM to summarize one chunk.
- **Reduce Chain** → Prompt the LLM to synthesize multiple summaries.
- **MapReduceDocumentsChain** → Orchestrates map + reduce.

---

# 🧑‍💻 Code Example — Summarizing Long Text

Let’s make a demo that takes a long article, splits it, and summarizes it using MapReduce.

```ts
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
(repeat this paragraph to simulate a long text)
`

// 3. Split into chunks
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 50,
})

const docs = await splitter.splitDocuments([new Document({ pageContent: longText })])

// 4. Create MapReduce Chain
const summarizeChain = loadSummarizationChain(llm, {
  type: 'map_reduce',
})

// 5. Run
async function runDemo() {
  console.log('=== Running MapReduce Summarizer ===')
  const summary = await summarizeChain.invoke(docs)
  console.log('\n📌 Final Summary:\n', summary)
}

runDemo().catch(console.error)
```

---

# 🔍 Expected Output

- **Intermediate**: Each chunk gets summarized.
- **Final**: A concise **global summary** of the entire text.

---

✅ This example shows how LangChain lets you **summarize large documents** in a scalable way.
⚡ This is foundational for **RAG (Retrieval-Augmented Generation)** where docs are retrieved, split, and summarized.

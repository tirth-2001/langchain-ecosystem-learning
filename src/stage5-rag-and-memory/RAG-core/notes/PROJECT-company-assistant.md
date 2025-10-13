# 🧠 **5.1.6 — Micro-Project: Company Knowledge Assistant (RAG End-to-End)**

### 🎯 **Goal**

Build a **Retrieval-Augmented Question-Answering assistant** that can:

- Ingest and index company documents (PDFs, policies, internal FAQs, wikis).
- Generate embeddings using multiple providers.
- Store and query embeddings through a vector store.
- Retrieve contextually relevant information and generate responses with citations.
- Work in both **single-turn** and **conversational** modes.

Think of it as an internal AI “wiki” for your company.

---

## 🧩 Project Overview

| Layer               | Responsibility                                                    | Source       |
| ------------------- | ----------------------------------------------------------------- | ------------ |
| **Ingestion**       | Load company docs from multiple sources (local, URL, API).        | (from 5.1.1) |
| **Embeddings**      | Convert chunks into vector embeddings (OpenAI / Cohere / HF).     | (from 5.1.2) |
| **Vector Store**    | Persist & query embeddings.                                       | (from 5.1.3) |
| **Retriever**       | Fetch top-K chunks per query.                                     | (from 5.1.4) |
| **RAG Chain**       | Combine retriever output + LLM to generate answer with citations. | (from 5.1.5) |
| **Interface Layer** | CLI or API endpoint for queries.                                  | (new here)   |

---

## 🧱 Folder Structure

```
company-knowledge-assistant/
│
├── src/
│   ├── ingestion/
│   │   ├── fileLoader.ts
│   │   ├── urlLoader.ts
│   │   ├── apiLoader.ts
│   │   └── chunker.ts
│   │
│   ├── embeddings/
│   │   ├── embeddingManager.ts
│   │
│   ├── vector/
│   │   └── vectorStoreManager.ts
│   │
│   ├── retriever/
│   │   └── retriever.ts
│   │
│   ├── rag/
│   │   ├── chains/
│   │   │   ├── ragQnAChain.ts
│   │   │   ├── conversationalRagChain.ts
│   │   │   └── ragWithCitations.ts
│   │   └── index.ts
│   │
│   ├── interface/
│   │   ├── cli.ts
│   │   └── server.ts
│   │
│   └── config.ts
│
├── data/                     ← sample company docs
└── package.json
```

---

## ⚙️ Setup — `config.ts`

```ts
// src/config.ts
export const config = {
  embeddingsProvider: process.env.EMBED_PROVIDER || 'openai', // "openai" | "cohere" | "huggingface"
  vectorStore: process.env.VECTOR_STORE || 'faiss',
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
  topK: 5,
  minScore: 0.15,
}
```

---

## 🧾 Step 1: Document Ingestion

Combine multiple ingestion strategies.

```ts
// src/ingestion/index.ts
import { loadLocalDocuments } from './fileLoader'
import { loadDocumentsFromUrls } from './urlLoader'
import { loadDocumentsFromApi } from './apiLoader'
import { chunkDocuments } from './chunker'

export async function ingestAll() {
  const local = await loadLocalDocuments('./data')
  const urls = await loadDocumentsFromUrls(['https://example.com/privacy-policy', 'https://example.com/hr-policy'])
  const api = await loadDocumentsFromApi('https://api.example.com/docs')
  const all = [...local, ...urls, ...api]
  const chunks = await chunkDocuments(all)
  return chunks
}
```

---

## 🧠 Step 2: Embedding Generation

```ts
// src/embeddings/embeddingManager.ts
import { Embeddings } from 'langchain/embeddings'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { CohereEmbeddings } from 'langchain/embeddings/cohere'
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf'
import { config } from '../config'

export const getEmbeddingProvider = (): Embeddings => {
  switch (config.embeddingsProvider) {
    case 'cohere':
      return new CohereEmbeddings({ apiKey: process.env.COHERE_API_KEY! })
    case 'huggingface':
      return new HuggingFaceInferenceEmbeddings({ model: 'sentence-transformers/all-MiniLM-L6-v2' })
    default:
      return new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' })
  }
}
```

---

## 🗃️ Step 3: Vector Store Manager

```ts
// src/vector/vectorStoreManager.ts
import { FAISS } from 'langchain/vectorstores/faiss'
import { getEmbeddingProvider } from '../embeddings/embeddingManager'

export class VectorStoreManager {
  private store: FAISS | null = null

  async init(chunks: any[]) {
    const embeddings = getEmbeddingProvider()
    this.store = await FAISS.fromTexts(
      chunks.map((c) => c.pageContent),
      chunks.map((c) => c.metadata),
      embeddings,
    )
  }

  async search(query: string, k = 5) {
    if (!this.store) throw new Error('Vector store not initialized')
    const results = await this.store.similaritySearchWithScore(query, k)
    return results.map(([doc, score]) => ({
      text: doc.pageContent,
      metadata: doc.metadata,
      score,
    }))
  }
}
```

---

## 🔍 Step 4: Retriever

```ts
// src/retriever/retriever.ts
import { VectorStoreManager } from '../vector/vectorStoreManager'

export const buildRetriever = (store: VectorStoreManager, topK: number) => ({
  async retrieve(query: string) {
    const results = await store.search(query, topK)
    return results
  },
})
```

---

## 🧩 Step 5: RAG Chain Integration

Use the earlier **ragWithCitations** chain from 5.1.5.

```ts
// src/rag/index.ts
import { buildRagWithCitations } from './chains/ragWithCitations'
import { VectorStoreManager } from '../vector/vectorStoreManager'

export function buildRAG(store: VectorStoreManager) {
  return buildRagWithCitations(store, { topK: 5, minScore: 0.15 })
}
```

---

## 💬 Step 6: CLI Interface

Quick console interface to query the assistant.

```ts
// src/interface/cli.ts
import readline from 'readline'
import { ingestAll } from '../ingestion'
import { VectorStoreManager } from '../vector/vectorStoreManager'
import { buildRAG } from '../rag'

async function main() {
  console.log('🚀 Initializing Company Knowledge Assistant...')

  const docs = await ingestAll()
  const store = new VectorStoreManager()
  await store.init(docs)
  const rag = buildRAG(store)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  const ask = async () => {
    rl.question('\n🧑‍💼 Ask a question: ', async (q) => {
      const res = await rag.run(q)
      console.log(`\n🤖 Answer: ${res.answer}`)
      console.log('📚 Sources:', res.sources.map((s) => s.source).join(', '))
      ask()
    })
  }
  ask()
}

main()
```

---

## 🌐 Step 7: Optional Express API

```ts
// src/interface/server.ts
import express from 'express'
import { ingestAll } from '../ingestion'
import { VectorStoreManager } from '../vector/vectorStoreManager'
import { buildRAG } from '../rag'
;(async () => {
  const docs = await ingestAll()
  const store = new VectorStoreManager()
  await store.init(docs)
  const rag = buildRAG(store)

  const app = express()
  app.use(express.json())

  app.post('/query', async (req, res) => {
    const { question } = req.body
    const result = await rag.run(question)
    res.json(result)
  })

  app.listen(4000, () => console.log('💬 Company Knowledge Assistant running on http://localhost:4000'))
})()
```

---

## ✅ Test Run (CLI Example)

```
$ npm start
🚀 Initializing Company Knowledge Assistant...
🧑‍💼 Ask a question: What is the company's leave policy?
🤖 Answer: Full-time employees are entitled to 24 paid leaves per year. Requests must be submitted 10 days in advance.
📚 Sources: HR_policy.pdf, handbook.md
```

---

## 🧩 Production Enhancements

| Enhancement                  | Description                                                       |
| ---------------------------- | ----------------------------------------------------------------- |
| 🔁 **Incremental ingestion** | Detect changed docs and update embeddings selectively.            |
| ⚡ **Caching & LRU**         | Cache top embeddings or recent queries.                           |
| 🧠 **Hybrid retrieval**      | Combine vector + keyword (BM25).                                  |
| 💬 **Memory integration**    | Use `ConversationalRetrievalQAChain` for ongoing chats.           |
| 🔒 **Access control**        | Restrict doc retrieval based on metadata (department, user role). |
| 🔎 **Eval dashboard**        | Log queries, latency, hit rate, accuracy metrics.                 |
| 🧩 **Embedding switching**   | Add provider switcher for experimentation (OpenAI vs Cohere).     |

---

## 🎯 Outcomes

After completing this:

- You’ve built a **fully modular, provider-agnostic, production-ready RAG pipeline**.
- You understand how every stage of retrieval and generation connects.
- You can extend this base into:

  - an **internal company knowledge bot**,
  - a **customer support assistant**, or
  - a **domain-specific AI FAQ**.

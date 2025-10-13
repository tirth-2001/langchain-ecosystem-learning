# **5.1.3 – Vector Store Setup (LangChain + Multi-Backend)**

💾 _Persist embeddings for efficient similarity search_

---

## 📖 **Theory**

A **Vector Store** is a specialized database optimized for storing and searching **high-dimensional embeddings**.
When a query comes in, we embed it into the same vector space and find **nearest neighbors** (semantic similarity).

### 🧩 **Core Capabilities**

1. **Add / Upsert** — Insert or update vectors with metadata.
2. **Query / Search** — Find top-k most similar vectors.
3. **Delete / Purge** — Remove outdated data.
4. **Persistence / Indexing** — Store vectors on disk or via API.

### 🧠 **Similarity Search**

Most stores support:

- **Cosine similarity** (angle between vectors)
- **Dot product**
- **L2 distance** (Euclidean)

### ⚙️ **Popular Stores**

| Type                            | Example                          | Description                             |
| ------------------------------- | -------------------------------- | --------------------------------------- |
| **Local**                       | `FAISS`, `Chroma`                | Offline, lightweight, quick setup       |
| **Managed Cloud**               | `Pinecone`, `Weaviate`, `Milvus` | Scalable, fast, auto-managed            |
| **Hybrid (metadata + vectors)** | `ElasticSearch`, `Qdrant`        | Store both structured and semantic data |

### 🏗️ **In LangChain**

Each vector store exposes a common API:

```ts
await store.addDocuments(docs)
await store.similaritySearch('query', k)
await store.delete({ ids })
```

→ making it easy to swap providers with minimal code changes.

---

## 🧩 **System Design**

Our implementation aims for **provider-agnostic storage**, supporting:

- Local FAISS (default for dev)
- Chroma DB (local persistence)
- Pinecone (production-ready cloud)

We’ll define:

- `IVectorStore` interface
- Individual provider implementations
- A `VectorStoreManager` that abstracts selection
- Query + upsert + delete operations

---

## 💻 **Implementation (TypeScript + LangChain)**

### `types.ts` (extend previous)

```ts
export interface VectorQueryResult {
  id: string
  score: number
  metadata: Record<string, any>
  text: string
}
```

---

### `vectorStores/faissStore.ts`

```ts
// src/rag/vectorStores/faissStore.ts
import { FaissStore } from '@langchain/community/vectorstores/faiss'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import * as fs from 'fs'

export class FaissVectorStore {
  private store: FaissStore | null = null
  private persistPath: string
  private embedding: OpenAIEmbeddings

  constructor(persistPath = './vector/faiss.index') {
    this.persistPath = persistPath
    this.embedding = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
  }

  async init(docs?: Document[]) {
    if (fs.existsSync(this.persistPath)) {
      console.log('🔄 Loading existing FAISS index...')
      this.store = await FaissStore.load(this.persistPath, this.embedding)
    } else if (docs) {
      console.log('🆕 Creating new FAISS index...')
      this.store = await FaissStore.fromDocuments(docs, this.embedding)
      await this.store.save(this.persistPath)
    } else {
      throw new Error('No documents provided and FAISS index not found')
    }
  }

  async addDocuments(docs: Document[]) {
    if (!this.store) throw new Error('Store not initialized')
    await this.store.addDocuments(docs)
    await this.store.save(this.persistPath)
  }

  async similaritySearch(query: string, k = 3) {
    if (!this.store) throw new Error('Store not initialized')
    const results = await this.store.similaritySearch(query, k)
    return results.map((r) => ({
      id: r.metadata?.id ?? '',
      score: (r as any).score ?? 0,
      metadata: r.metadata,
      text: r.pageContent,
    }))
  }

  async deleteAll() {
    if (fs.existsSync(this.persistPath)) fs.rmSync(this.persistPath)
    this.store = null
  }
}
```

---

### `vectorStores/chromaStore.ts`

```ts
// src/rag/vectorStores/chromaStore.ts
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'

export class ChromaVectorStore {
  private store: Chroma | null = null
  private embedding: OpenAIEmbeddings
  private collectionName: string

  constructor(collectionName = 'docs_collection') {
    this.collectionName = collectionName
    this.embedding = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
  }

  async init(docs?: Document[]) {
    if (docs) {
      console.log('🆕 Initializing new Chroma collection...')
      this.store = await Chroma.fromDocuments(docs, this.embedding, {
        collectionName: this.collectionName,
      })
    } else {
      this.store = new Chroma(this.embedding, { collectionName: this.collectionName })
    }
  }

  async addDocuments(docs: Document[]) {
    if (!this.store) throw new Error('Store not initialized')
    await this.store.addDocuments(docs)
  }

  async similaritySearch(query: string, k = 3) {
    if (!this.store) throw new Error('Store not initialized')
    const results = await this.store.similaritySearch(query, k)
    return results.map((r) => ({
      id: r.metadata?.id ?? '',
      score: (r as any).score ?? 0,
      metadata: r.metadata,
      text: r.pageContent,
    }))
  }
}
```

---

### `vectorStores/pineconeStore.ts`

```ts
// src/rag/vectorStores/pineconeStore.ts
import { PineconeStore } from '@langchain/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import { Pinecone } from '@pinecone-database/pinecone'

export class PineconeVectorStore {
  private store: PineconeStore | null = null
  private client: Pinecone
  private indexName: string
  private embedding: OpenAIEmbeddings

  constructor(indexName = 'company-knowledge-index') {
    this.indexName = indexName
    this.client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
    this.embedding = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
  }

  async init(docs?: Document[]) {
    const index = this.client.Index(this.indexName)
    if (docs) {
      this.store = await PineconeStore.fromDocuments(docs, this.embedding, { pineconeIndex: index })
    } else {
      this.store = await PineconeStore.fromExistingIndex(this.embedding, { pineconeIndex: index })
    }
  }

  async addDocuments(docs: Document[]) {
    if (!this.store) throw new Error('Store not initialized')
    await this.store.addDocuments(docs)
  }

  async similaritySearch(query: string, k = 3) {
    if (!this.store) throw new Error('Store not initialized')
    const results = await this.store.similaritySearch(query, k)
    return results.map((r) => ({
      id: r.metadata?.id ?? '',
      score: (r as any).score ?? 0,
      metadata: r.metadata,
      text: r.pageContent,
    }))
  }
}
```

---

### `vectorStoreManager.ts` — Provider abstraction

```ts
// src/rag/vectorStoreManager.ts
import { FaissVectorStore } from './vectorStores/faissStore'
import { ChromaVectorStore } from './vectorStores/chromaStore'
import { PineconeVectorStore } from './vectorStores/pineconeStore'

export class VectorStoreManager {
  private provider: any

  constructor(type: 'faiss' | 'chroma' | 'pinecone') {
    if (type === 'faiss') this.provider = new FaissVectorStore()
    else if (type === 'chroma') this.provider = new ChromaVectorStore()
    else if (type === 'pinecone') this.provider = new PineconeVectorStore()
    else throw new Error('Invalid store type')
  }

  async init(docs?: any[]) {
    await this.provider.init(docs)
  }

  async addDocuments(docs: any[]) {
    await this.provider.addDocuments(docs)
  }

  async search(query: string, k = 3) {
    return await this.provider.similaritySearch(query, k)
  }

  async deleteAll() {
    if (this.provider.deleteAll) await this.provider.deleteAll()
  }
}
```

---

### 🧪 **Usage Example**

```ts
// src/rag/example/vectorStoreExample.ts
import { loadLocalDocuments } from '../ingestion/fileLoader'
import { chunkDocuments } from '../ingestion/chunker'
import { VectorStoreManager } from '../vectorStoreManager'
;(async () => {
  const docs = await loadLocalDocuments('./data')
  const chunks = await chunkDocuments(docs, 500, 100)

  const storeManager = new VectorStoreManager('faiss')
  await storeManager.init(chunks)

  console.log("🔍 Searching for: 'refund policy for damaged items'")
  const results = await storeManager.search('refund policy for damaged items', 3)
  console.log(
    'Results:',
    results.map((r) => r.text),
  )
})()
```

---

## ⚙️ **Production Tips**

|                Concern | Best Practice                                       |
| ---------------------: | --------------------------------------------------- |
|    **Large ingestion** | Use async batching or background queues             |
|         **Reindexing** | Hash + timestamp-based versioning to detect changes |
| **Dimension mismatch** | Keep same embedding model for query + store         |
|   **Hybrid retrieval** | Combine keyword retrievers (BM25) + vector search   |
|         **Monitoring** | Track latency and hit rates per query               |
|        **Persistence** | Periodically back up FAISS/Chroma locally or to S3  |
| **GDPR/Data deletion** | Use metadata-based deletion policies                |

---

## ✅ **Learning Outcomes**

✅ Understand what a Vector Store is and its core operations
✅ Know how to use **FAISS**, **Chroma**, and **Pinecone** in LangChain
✅ Build an abstraction for interchangeable vector stores
✅ Ready for next step → **Retriever Design (5.1.4)**

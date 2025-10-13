# **5.1.2 – Embedding Generation (LangChain + Multi-provider)**

## 📖 Theory (concise & pragmatic)

**What embeddings do:** convert text chunks into fixed-length numeric vectors that capture semantic meaning. Retrieval systems compare vectors (cosine/dot) to find similar chunks.

**Why multiple providers:** tradeoffs between cost, latency, quality, and multilingual support. Having an abstraction lets you switch providers (or fallback) depending on use-case.

**Key production concerns:**

- **Batching**: send chunks in batches to avoid rate limits and improve throughput.
- **Caching**: avoid recomputing embeddings for unchanged chunks (hash content).
- **Normalization**: consistent vector normalization may be needed (cosine similarity expects normalized vectors).
- **Error handling & retry**: retry transient failures (exponential backoff).
- **Model choice**: affects dimension, cost, and semantics — keep it configurable.
- **Privacy & locality**: HuggingFace local models allow on-prem embeddings (no upstream calls).

---

## 🧩 Anatomy / Breakdown

1. **Provider interface** — uniform `embed(texts[])` API.
2. **Implementations** — OpenAI, Cohere, HuggingFace (local or hosted).
3. **Batcher** — chunk list → batches of N → call provider.
4. **Cache** — map/hash to store embeddings (simple file or Redis).
5. **Orchestrator** — takes `Document[]` (from ingestion) → dedupe/normalize → call embedding pipeline → returns `[ { id, embedding, metadata } ]` for vector store ingestion.

---

## 💻 TypeScript Implementation (LangChain-centric)

Below is an implementation sketch you can drop into your repo. It uses LangChain embedding classes where available and falls back to HTTP-based calls for Cohere (if necessary). It keeps a provider-agnostic orchestration layer.

> Note: adjust import paths to your installed LangChain version (`langchain/embeddings/...`). Replace `process.env.*` keys in `.env`.

### `types.ts` (shared types)

```ts
// src/rag/types.ts
import { Document } from '@langchain/core/documents'

export interface EmbeddingRecord {
  id: string // unique id for chunk (e.g., hashed)
  vector: number[] // embedding vector
  metadata: Record<string, any>
  text: string
}

export type EmbeddingProviderName = 'openai' | 'cohere' | 'huggingface'
```

---

### `providers/openaiEmbeddings.ts`

```ts
// src/rag/providers/openaiEmbeddings.ts
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import type { EmbeddingRecord } from '../types'

export class OpenAIProvider {
  private client: OpenAIEmbeddings
  constructor(opts?: { model?: string }) {
    this.client = new OpenAIEmbeddings({ model: opts?.model ?? 'text-embedding-3-small' })
  }

  // texts: string[] => returns vectors[] in same order
  async embed(texts: string[]): Promise<number[][]> {
    return await this.client.embedDocuments(texts)
  }
}
```

---

### `providers/cohereEmbeddings.ts`

```ts
// src/rag/providers/cohereEmbeddings.ts
import { CohereEmbeddings } from 'langchain/embeddings/cohere'
export class CohereProvider {
  private client: CohereEmbeddings
  constructor(opts?: { model?: string }) {
    this.client = new CohereEmbeddings({ model: opts?.model ?? 'embed-english-v2.0' })
  }

  async embed(texts: string[]): Promise<number[][]> {
    return await this.client.embedDocuments(texts)
  }
}
```

---

### `providers/huggingfaceEmbeddings.ts`

```ts
// src/rag/providers/huggingfaceEmbeddings.ts
import { HuggingFaceInstructEmbeddings } from 'langchain/embeddings/hf-instruct' // or huggingface
export class HfProvider {
  private client: HuggingFaceInstructEmbeddings
  constructor(opts?: { model?: string; apiKey?: string }) {
    this.client = new HuggingFaceInstructEmbeddings({
      modelName: opts?.model ?? 'sentence-transformers/all-MiniLM-L6-v2',
      apiKey: opts?.apiKey ?? process.env.HF_API_KEY,
    })
  }

  async embed(texts: string[]): Promise<number[][]> {
    return await this.client.embedDocuments(texts)
  }
}
```

> If you need fully offline embedding, swap the HF client for a local inference server (ONNX / PyTorch / or a local REST endpoint), but keep the same interface.

---

### `utils/hash.ts` (for caching IDs)

```ts
// src/rag/utils/hash.ts
import crypto from 'crypto'

export const sha1 = (text: string) => crypto.createHash('sha1').update(text, 'utf8').digest('hex')
```

---

### `embeddingService.ts` — Batching, caching, orchestration

```ts
// src/rag/embeddingService.ts
import fs from 'fs'
import path from 'path'
import pRetry from 'p-retry'
import LRU from 'lru-cache'

import { OpenAIProvider } from './providers/openaiEmbeddings'
import { CohereProvider } from './providers/cohereEmbeddings'
import { HfProvider } from './providers/huggingfaceEmbeddings'
import { EmbeddingRecord } from './types'
import { sha1 } from './utils/hash'

const DEFAULT_BATCH_SIZE = 64

// Simple in-memory cache (swap for Redis/file if needed)
const cache = new LRU<string, number[]>({ max: 50000 })

export class EmbeddingService {
  private provider: any
  private batchSize: number

  constructor(providerName: string, opts: { batchSize?: number; model?: string } = {}) {
    this.batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE
    if (providerName === 'openai') this.provider = new OpenAIProvider({ model: opts.model })
    else if (providerName === 'cohere') this.provider = new CohereProvider({ model: opts.model })
    else if (providerName === 'huggingface') this.provider = new HfProvider({ model: opts.model })
    else throw new Error('Unknown provider')
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    // retry transient failures
    return await pRetry(() => this.provider.embed(texts), { retries: 3 })
  }

  // main orchestration
  async embedDocuments(docs: { id?: string; text: string; metadata?: any }[]): Promise<EmbeddingRecord[]> {
    const results: EmbeddingRecord[] = []
    const toBatch: { idx: number; text: string; id: string }[] = []

    // Prepare batch list, consult cache
    for (let i = 0; i < docs.length; i++) {
      const text = docs[i].text
      const id = docs[i].id ?? sha1(text)
      const key = `emb:${id}`
      const cached = cache.get(key)
      if (cached) {
        results.push({ id, text, vector: cached, metadata: docs[i].metadata ?? {} })
      } else {
        toBatch.push({ idx: i, text, id })
      }
    }

    // Process in batches
    for (let i = 0; i < toBatch.length; i += this.batchSize) {
      const batch = toBatch.slice(i, i + this.batchSize)
      const texts = batch.map((b) => b.text)
      const vectors = await this.embedBatch(texts)

      vectors.forEach((vec, j) => {
        const id = batch[j].id
        const metadata = docs[batch[j].idx].metadata ?? {}
        cache.set(`emb:${id}`, vec)
        results.push({ id, text: batch[j].text, vector: vec, metadata })
      })
    }

    return results
  }
}
```

---

### `usage example` — wiring ingestion → chunking → embedding

```ts
// src/rag/pipeline.ts
import { loadLocalDocuments } from './ingestion/fileLoader' // previous 5.1.1 module
import { chunkDocuments } from './ingestion/chunker'
import { EmbeddingService } from './embeddingService'

;(async () => {
  const docs = await loadLocalDocuments('./data')
  const chunks = (await chunkDocuments(docs, 500, 100)).map((d, i) => ({
    id: `${d.metadata?.source ?? 'doc'}::${i}`,
    text: d.pageContent ?? (d as any).content ?? '',
    metadata: d.metadata ?? {},
  }))

  // instantiate provider: "openai" | "cohere" | "huggingface"
  const embService = new EmbeddingService('openai', { batchSize: 64, model: 'text-embedding-3-small' })

  const embs = await embService.embedDocuments(chunks)
  console.log('embedded:', embs.length)

  // Next: persist embs to vector store (stage 5.1.3)
})()
```

---

## 🚀 Production Notes & Best Practices

- **Cache key design:** Use content hash + source + chunk window id. This lets you skip re-embedding unchanged content.
- **Batch tuning:** Larger batches increase throughput but may hit rate limits; tune by provider.
- **Parallelization:** For very large corpora use worker queues (BullMQ, Celery, etc.) and per-worker rate-limiting.
- **Fallback provider:** If primary provider fails, have a fallback (e.g., OpenAI → HuggingFace) — keep semantics in mind (dimensions may differ).
- **Dimension handling:** Ensure vector dims are consistent between provider and vector store. Some HF models differ in size.
- **Normalization:** For cosine similarity, you can normalize vectors to unit length before storing; some vector stores handle this internally.
- **Privacy:** If you must avoid sending PII to external providers, either scrub data or run embeddings locally (HF).
- **Cost tracking:** Log token counts and requests per provider to estimate cost; consider sampling for cost monitoring.
- **Embeddings drift:** When switching models or provider versions, consider re-indexing.

---

## ✅ Outcomes / Flashcards

|              Concept | One-liner                                                               |
| -------------------: | ----------------------------------------------------------------------- |
|           Embeddings | Numeric vectors representing semantic meaning of text.                  |
| Provider abstraction | Wrap providers in a uniform interface for swapability.                  |
|             Batching | Send many texts per request to optimize throughput and cost.            |
|              Caching | Avoid recomputing embeddings for identical text chunks.                 |
|        Normalization | Unit-length vectors simplify cosine-based retrieval.                    |
|             Fallback | Use secondary providers when primary is unavailable, mind dim mismatch. |

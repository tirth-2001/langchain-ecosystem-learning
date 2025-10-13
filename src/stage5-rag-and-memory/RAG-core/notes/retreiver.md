Great — let’s build **5.1.4 – Retriever Design** in the same production-minded, LangChain-first style: concise theory, clear anatomy, TypeScript implementations (semantic retriever, BM25 keyword retriever, hybrid retriever, reranking), orchestration examples, and production best-practices.

---

# **5.1.4 – Retriever Design**

**Goal:** Design flexible retrievers that find the most relevant chunks for a query. Support semantic (embedding) search, keyword/BM25 search, hybrid approaches, metadata filtering, dynamic `top-k` and thresholding, and optional reranking with an LLM.

---

## 📖 Theory (concise & practical)

A **retriever** receives a user query and returns a small set of candidate document chunks (with metadata) for the downstream LLM to use as context. Key concerns:

- **Precision vs Recall:** Higher `k` increases recall but may waste tokens. Tune `k` per use-case.
- **Semantic vs Keyword:** Semantic (embedding) search finds conceptually similar text; keyword search (BM25) finds explicit term matches. Hybrid approaches combine both.
- **Filtering & Scoping:** Use metadata to narrow the search (source, date, language, tags) to improve relevance and efficiency.
- **Reranking:** Use a small LLM scoring step to reorder candidates based on contextual relevance (expensive — use sparingly).
- **Thresholding:** Discard results below a similarity score to avoid hallucinations.
- **Caching:** Cache retriever results for identical queries to reduce load and latency.

---

## 🧩 Anatomy / Breakdown

1. **EmbeddingRetriever** — uses vector store similarity search.
2. **BM25Retriever (Keyword)** — uses inverted-index/Elasticsearch/Whoosh (or local js implementation) for term matching.
3. **HybridRetriever** — combine results from semantic + keyword; merge + dedupe + score fusion.
4. **FilteredRetriever** — accepts `metadataFilter` param to restrict search space.
5. **Reranker** — optional step that uses an LLM to re-score candidates.
6. **QueryPreprocessor** — normalizes query, optional expansion (synonyms / spell-correct).
7. **DynamicTopKStrategy** — adjust `k` based on query length, confidence, or usage pattern.

---

## 💻 TypeScript Implementations (LangChain-first)

Assume `VectorStoreManager` from 5.1.3 and `EmbeddingService` from 5.1.2 exist. We'll implement a set of retrievers and a `RetrieverCoordinator`.

### `retrievers/embeddingRetriever.ts`

```ts
// src/rag/retrievers/embeddingRetriever.ts
import type { VectorStoreManager } from '../vectorStoreManager'
import type { VectorQueryResult } from '../types'

/**
 * Embedding (semantic) retriever: uses vector store's similaritySearch.
 */
export class EmbeddingRetriever {
  private store: VectorStoreManager
  private topK: number
  private similarityThreshold?: number // optional threshold

  constructor(store: VectorStoreManager, opts?: { topK?: number; threshold?: number }) {
    this.store = store
    this.topK = opts?.topK ?? 5
    this.similarityThreshold = opts?.threshold
  }

  async getCandidates(queryEmbedding: number[] | string, k?: number, metadataFilter?: any) {
    // if queryEmbedding is a string, vector store will embed query itself (some stores support)
    const top = k ?? this.topK
    const results = await this.store.search(typeof queryEmbedding === 'string' ? queryEmbedding : queryEmbedding, top)

    // optional thresholding (assuming results contain score normalized 0..1 or as returned)
    if (this.similarityThreshold != null) {
      return results.filter((r: VectorQueryResult) => (r.score ?? 0) >= this.similarityThreshold)
    }
    return results
  }
}
```

> Note: Some vector stores accept raw text query and embed internally; others require you to pass query embedding. `VectorStoreManager` should abstract that detail.

---

### `retrievers/bm25Retriever.ts` (simple local BM25 wrapper)

For production, prefer an external IR engine (Elasticsearch, Vespa, Typesense). Here’s a simplified JS BM25 wrapper (usable for prototyping).

```ts
// src/rag/retrievers/bm25Retriever.ts
import { BM25 } from 'wink-bm25-text-search' // lightweight JS BM25
import type { Document } from '@langchain/core/documents'
import type { VectorQueryResult } from '../types'

/**
 * Build index once, then search.
 */
export class BM25Retriever {
  private idx: any
  private docs: Document[] = []
  private field = 'pageContent'

  constructor() {
    this.idx = BM25()
    this.idx.defineConfig({ fldWeights: { pageContent: 1 } })
    this.idx.definePrepTasks([
      // simple prep: lowercase, remove punctuation
      (text: string) => text.toLowerCase(),
    ])
  }

  buildIndex(docs: Document[]) {
    this.docs = docs
    this.idx.reset()
    docs.forEach((d, i) => {
      this.idx.addDoc({ id: i.toString(), pageContent: d.pageContent }, i.toString())
    })
    this.idx.consolidate()
  }

  search(query: string, k = 5): VectorQueryResult[] {
    const hits = this.idx.search(query, k)
    return hits.map((h: any) => {
      const doc = this.docs[parseInt(h.id, 10)]
      return {
        id: `${h.id}`,
        score: h.score,
        metadata: doc.metadata ?? {},
        text: doc.pageContent,
      } as VectorQueryResult
    })
  }
}
```

> Production tip: Use Elasticsearch/Opensearch for large corpora and advanced filtering.

---

### `retrievers/hybridRetriever.ts` — Combine semantic + keyword

```ts
// src/rag/retrievers/hybridRetriever.ts
import type { EmbeddingRetriever } from './embeddingRetriever'
import type { BM25Retriever } from './bm25Retriever'
import type { VectorQueryResult } from '../types'

/**
 * Hybrid strategy: union top-N from each retriever, dedupe, and fuse scores.
 */
export class HybridRetriever {
  private semantic: EmbeddingRetriever
  private keyword: BM25Retriever
  private topK: number

  constructor(semantic: EmbeddingRetriever, keyword: BM25Retriever, opts?: { topK?: number }) {
    this.semantic = semantic
    this.keyword = keyword
    this.topK = opts?.topK ?? 10
  }

  // Accepts either raw text query or embedding (depending on semantic retriever)
  async getCandidates(query: string | number[], k?: number) {
    const top = k ?? this.topK
    const sem = await this.semantic.getCandidates(query, Math.ceil(top / 2))
    const key = this.keyword.search(typeof query === 'string' ? query : (query as any).toString(), Math.ceil(top / 2))

    // merge by id (or text), dedupe
    const map = new Map<string, VectorQueryResult>()
    const push = (item: VectorQueryResult) => {
      const existing = map.get(item.id)
      if (!existing) map.set(item.id, item)
      else if ((item.score ?? 0) > (existing.score ?? 0)) map.set(item.id, item) // keep higher score
    }

    sem.forEach(push)
    key.forEach(push)

    // convert to array and sort (score descending)
    const merged = Array.from(map.values()).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    return merged.slice(0, top)
  }
}
```

---

### `retrievers/reranker.ts` — Optional LLM-based re-ranking

```ts
// src/rag/retrievers/reranker.ts
import type { VectorQueryResult } from '../types'
import { ChatOpenAI } from 'langchain/chat_models/openai'

/**
 * Reranker: Sends the query + candidate snippets to an LLM to get relevance scores.
 * Use with caution (costly). Consider small models & batching.
 */
export class Reranker {
  private model: any

  constructor(modelName = 'gpt-4o-mini') {
    this.model = new ChatOpenAI({ modelName, temperature: 0 })
  }

  /**
   * candidates: [{text, metadata, score}]
   * returns: same shape with reranked score
   */
  async rerank(query: string, candidates: VectorQueryResult[]) {
    const prompt = this.buildPrompt(query, candidates)
    const resp = await this.model.call(prompt)
    // Expect LLM to return JSON array of scores in same order, or (id,score) mapping
    // For robustness, parse natural text or simple JSON — include fallback logic.

    try {
      const parsed = JSON.parse(resp.text)
      // map back
      return candidates.map((c, i) => ({ ...c, score: parsed[i] ?? c.score }))
    } catch (e) {
      // fallback: return original candidates
      console.warn('Reranker parse failed, returning original order', e)
      return candidates
    }
  }

  buildPrompt(query: string, candidates: VectorQueryResult[]) {
    // Keep prompt small: ask LLM to score each snippet 0..1 with short JSON array.
    const candidateText = candidates.map((c, i) => `#${i}\n${c.text.slice(0, 500)}\n---\n`).join('\n')

    return `You are a relevance grader. Query: "${query}"\nRate each snippet's relevance to the query on a 0..1 scale.\nReturn a JSON array of numbers in the same order as the snippets.\n\nSnippets:\n${candidateText}`
  }
}
```

> Important: define a strict expected output format to make parsing robust. Alternatively use structured output tools or LLM output parsers.

---

### `retrievers/retrieverCoordinator.ts` — Orchestrates retrieval pipeline

```ts
// src/rag/retrievers/retrieverCoordinator.ts
import type { VectorStoreManager } from '../vectorStoreManager'
import { EmbeddingRetriever } from './embeddingRetriever'
import { BM25Retriever } from './bm25Retriever'
import { HybridRetriever } from './hybridRetriever'
import { Reranker } from './reranker'

export class RetrieverCoordinator {
  embeddingRetriever: EmbeddingRetriever
  bm25Retriever: BM25Retriever
  hybridRetriever: HybridRetriever
  reranker?: Reranker

  constructor(storeManager: VectorStoreManager, docsForBM25: any[]) {
    this.embeddingRetriever = new EmbeddingRetriever(storeManager, { topK: 8, threshold: 0.2 })
    this.bm25Retriever = new BM25Retriever()
    this.bm25Retriever.buildIndex(docsForBM25)
    this.hybridRetriever = new HybridRetriever(this.embeddingRetriever, this.bm25Retriever, { topK: 8 })
  }

  enableReranker(modelName?: string) {
    this.reranker = new Reranker(modelName)
  }

  async retrieve(query: string, opts?: { mode?: 'semantic' | 'keyword' | 'hybrid' | 'semantic_rerank'; k?: number }) {
    const mode = opts?.mode ?? 'hybrid'
    let candidates
    if (mode === 'semantic') candidates = await this.embeddingRetriever.getCandidates(query, opts?.k)
    else if (mode === 'keyword') candidates = this.bm25Retriever.search(query, opts?.k ?? 5)
    else if (mode === 'hybrid') candidates = await this.hybridRetriever.getCandidates(query, opts?.k)
    else if (mode === 'semantic_rerank') {
      candidates = await this.embeddingRetriever.getCandidates(query, opts?.k)
      if (this.reranker) candidates = await this.reranker.rerank(query, candidates)
    } else candidates = await this.hybridRetriever.getCandidates(query, opts?.k)

    // final: filter duplicates and apply any post thresholding
    const unique = new Map<string, any>()
    for (const c of candidates) {
      unique.set(c.id || c.text, c)
    }
    return Array.from(unique.values())
  }
}
```

---

## 🔧 Orchestration Example (end-to-end)

```ts
// src/rag/example/retrievalExample.ts
import { VectorStoreManager } from '../vectorStoreManager'
import { RetrieverCoordinator } from '../retrievers/retrieverCoordinator'
import { loadLocalDocuments } from '../ingestion/fileLoader'
import { chunkDocuments } from '../ingestion/chunker'

;(async () => {
  // 1. prepare docs + vector store (assume already embedded & persisted)
  const docs = await loadLocalDocuments('./data')
  const chunks = await chunkDocuments(docs, 500, 100)

  const storeManager = new VectorStoreManager('faiss')
  await storeManager.init(chunks) // will create index when not present

  // 2. prepare retriever coordinator (BM25 on chunk list)
  const retriever = new RetrieverCoordinator(storeManager, chunks)

  // optionally enable reranker if you want LLM-based ordering:
  // retriever.enableReranker("gpt-4o-mini");

  // 3. run queries
  const query = 'How do I file a refund for a damaged product?'
  const results = await retriever.retrieve(query, { mode: 'hybrid', k: 8 })

  console.log('Top candidates:')
  results.forEach((r: any, i: number) => {
    console.log(`#${i} score=${r.score} source=${r.metadata?.source}`)
    console.log(r.text.slice(0, 300))
    console.log('----')
  })
})()
```

---

## 🚀 Production & Tuning Notes

- **Which retriever to use?**

  - FAQ-style exact match → `keyword` (BM25 or search index).
  - Conceptual or paraphrased queries → `semantic`.
  - Real-world systems → `hybrid` (covers both).

- **Top-k strategy**

  - Start with `k=5` for short responses; increase for complex queries.
  - Use dynamic `k`: longer queries → higher `k`; ambiguous queries → higher `k`.

- **Thresholding**

  - Use a minimum similarity to prevent unrelated chunks. Default `0.2 - 0.25` is a starting point; calibrate per data/model.

- **Reranking**

  - Useful when snippets have similar scores but varying contextual relevance.
  - Use a small, cheap model; rerank only top-N candidates (e.g., top 10).

- **Latency**

  - BM25 + local vector store is fast; cloud vector stores add network latency.
  - Cache common queries & their candidate lists.

- **Filtering**

  - Use metadata (e.g., `lang`, `domain`, `date`) to reduce noise and legal exposure.

- **Security**

  - Filter out confidential chunks unless user/session is authorized.

- **Evaluation**

  - Collect feedback clicks or relevance judgments and use them to tune fusion weights and thresholds.

- **Monitoring**

  - Track hit rate, recall@k, latency, API errors, and rerank usage/cost.

---

## ✅ Outcomes / Flashcards

|             Concept | One-liner                                                       |
| ------------------: | --------------------------------------------------------------- |
| Embedding Retriever | Semantic similarity via vector search.                          |
|      BM25 Retriever | Keyword matching using inverted index.                          |
|    Hybrid Retriever | Merge semantic + keyword results to balance recall & precision. |
|            Reranker | LLM-based reordering of candidates (costly, high-value).        |
|        Thresholding | Remove low-confidence candidates to reduce hallucination.       |
|       Dynamic Top-K | Adjust number of candidates based on query properties.          |

---

If you want, I can now:

- Implement **scoring fusion** strategies (weighted sum, reciprocal rank fusion),
- Add a **small evaluation harness** (record query → candidates → human label) to iterate on retriever quality, or
- Proceed to **5.1.5 – RAG Chain Integration** (how to stitch retriever output into prompt templates, citation formatting, and LLM chains).

Which would you like next?

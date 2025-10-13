# **5.1.5 – RAG Chain Integration**

**Goal:** Combine the retriever (from 5.1.4) + LLM into robust RAG chains that produce context-aware, citation-backed answers. Provide conversational and single-turn RAG patterns, ways to include metadata/citations, safe fallbacks, streaming, and optional integration with the memory layer.

---

## 📖 Theory (concise & focused)

**RAG Chain** = (Retriever → Context Assembly → Prompt Template → LLM → Post-processing)

Core ideas:

- **Retriever** supplies the LLM with concise, relevant context (top-k chunks).
- **Prompt template** controls how retrieved chunks + query are combined and instructs the model to cite sources, avoid hallucination, and state uncertainty.
- **LLM** generates the answer using provided context; use low temperature for factual answers.
- **Post-processing** filters answers, attaches citations, or triggers follow-ups (e.g., fallback when similarity too low).
- **Conversational RAG** adds conversation memory (short-term buffer) to provide multi-turn continuity alongside retrieval.

Key goals for a production RAG chain:

1. **Cite sources** so users can verify claims.
2. **Minimize hallucination** by instructing the LLM to say “I don’t know” when evidence is lacking.
3. **Keep context size bounded** — use top-k + token caps.
4. **Efficient token usage** — summarize long retrieved docs when necessary.
5. **Graceful fallbacks** — when retrieval returns nothing, call alternative strategies (web search, ask clarifying question, or decline).

---

## 🧩 Breakdown / Patterns

1. **Simple RetrievalQA** — query → retrieve top-k → fill a QA prompt → LLM answers + citations.
2. **ConversationalRetrieval** — include conversation history (Buffer/SummaryMemory) + retrieved context → answer multi-turn.
3. **Rerank & Refill** — retrieve → (optional rerank) → truncate/condense top context → call model.
4. **Cite & Source Format** — return structured metadata: `answer`, `sources: [{source, score, excerpt}]`.
5. **Low Confidence Handling** — if top similarity < threshold, return “Insufficient evidence” or trigger web search.
6. **Streaming** — stream LLM tokens while retrieving and assembling context (careful: retrieval must complete before streaming meaningful content).

---

## 💻 TypeScript — LangChain-first Implementations

Below are modular TypeScript examples so you can plug into your existing repo (assumes prior modules from 5.1.1–5.1.4 exist).

### 1) Simple RAG QA Chain (single-turn)

```ts
// src/rag/chains/ragQnAChain.ts
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { RetrievalQAChain } from 'langchain/chains'
import type { VectorStoreManager } from '../vectorStoreManager'
import { PromptTemplate } from 'langchain/prompts'

/**
 * Builds a RetrievalQAChain using a vector-store-backed retriever.
 *
 * behavior:
 *  - retrieves top-k chunks
 *  - passes context to the LLM using a safe prompt
 *  - returns answer + source snippets
 */
export const buildRagQAChain = (
  storeManager: VectorStoreManager,
  opts?: {
    modelName?: string
    temperature?: number
    topK?: number
  },
) => {
  const model = new ChatOpenAI({
    modelName: opts?.modelName ?? 'gpt-4o-mini',
    temperature: opts?.temperature ?? 0.0,
  })

  // Basic prompt instructing to use only provided documents
  const prompt = PromptTemplate.fromTemplate(`
You are an assistant that answers user questions using ONLY the provided context.
If the context does not contain the answer, respond: "I don't know based on the provided documents."
Provide a concise answer and then list the sources you used in the format: [source: <source>].
---------
Context:
{context}

---------
Question: {question}
Answer:
  `)

  // Build retriever from store manager; assume it exposes a `getRetriever()` or `search` method
  // LangChain has a RetrievalQAChain builder for convenience
  const qaChain = new RetrievalQAChain({
    combineDocumentsChain: undefined as any, // We'll use RetrievalQAChain convenience method below
    // We'll rely on the storeManager to provide a retriever object compatible with LangChain
  } as any)

  // Simpler: use LangChain built-in helper if supported by your SDK version:
  // const chain = RetrievalQAChain.fromLLM(model, storeManager.getRetriever({ k: opts?.topK || 5 }), { prompt });

  // Fallback manual implementation:
  const run = async (question: string) => {
    const results = await storeManager.search(question, opts?.topK ?? 5)
    const context = results
      .map((r: any, i: number) => `[[${i}] source=${r.metadata?.source ?? 'unknown'}]\n${r.text}`)
      .join('\n\n')
    const finalPrompt = prompt.format({ context, question })

    const resp = await model.call(finalPrompt) // or .generate depending on SDK
    return {
      answer: resp.text,
      sources: results.map((r: any) => ({
        source: r.metadata?.source,
        score: r.score,
        excerpt: r.text.slice(0, 400),
      })),
    }
  }

  return { run }
}
```

> Notes:
>
> - Use LangChain’s `RetrievalQAChain.fromLLM()` if your LangChain SDK supports it (it wires retriever + LLM + prompt automatically).
> - The example above shows an explicit approach to maintain transparency.

---

### 2) Conversational RAG Chain (multi-turn)

```ts
// src/rag/chains/conversationalRagChain.ts
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { ConversationalRetrievalQAChain } from 'langchain/chains'
import { BufferMemory } from 'langchain/memory'
import type { VectorStoreManager } from '../vectorStoreManager'

/**
 * Build a conversational retrieval chain that:
 *  - includes conversation memory (short buffer)
 *  - retrieves docs for each user query
 *  - responds with sources and optional follow-up question
 */
export const buildConversationalRag = (
  storeManager: VectorStoreManager,
  opts?: { modelName?: string; topK?: number },
) => {
  const model = new ChatOpenAI({ modelName: opts?.modelName ?? 'gpt-4o-mini', temperature: 0 })
  const memory = new BufferMemory({ returnMessages: true, memoryKey: 'chat_history' })

  // If your SDK provides ConversationalRetrievalQAChain:
  // const chain = ConversationalRetrievalQAChain.fromLLM(model, storeManager.getRetriever({ k: opts?.topK || 5 }), { memory });

  const run = async (userMessage: string) => {
    // 1. search
    const candidates = await storeManager.search(userMessage, opts?.topK ?? 5)

    // 2. construct context with chat history from memory (simplified)
    const chatHistory = (memory.loadMemory() as any) ?? []
    const contextStr = candidates.map((c: any, i: number) => `[[${i}] ${c.metadata?.source}] ${c.text}`).join('\n\n')

    const prompt = `
You are a helpful assistant. Use the provided conversation history and context to answer.
Conversation History:
${JSON.stringify(chatHistory).slice(0, 2000)}

Context:
${contextStr}

User: ${userMessage}
Answer concisely and list sources.
    `

    const resp = await model.call(prompt)
    // update memory - pseudo
    ;(memory as any).saveContext({ user: userMessage }, { ai: resp.text })

    return {
      answer: resp.text,
      sources: candidates.map((c: any) => ({ source: c.metadata?.source, excerpt: c.text.slice(0, 200) })),
    }
  }

  return { run, memory }
}
```

> Notes:
>
> - Use `ConversationalRetrievalQAChain` from LangChain if available (it handles memory + retriever orchestration).
> - `BufferMemory` or `SummaryMemory` can be used to keep the conversation context short/efficient.

---

### 3) RAG with Citation Formatting & Low Confidence Handling

```ts
// src/rag/chains/ragWithCitations.ts
import { ChatOpenAI } from 'langchain/chat_models/openai'
import type { VectorStoreManager } from '../vectorStoreManager'

export const buildRagWithCitations = (
  storeManager: VectorStoreManager,
  opts?: { modelName?: string; topK?: number; minScore?: number },
) => {
  const model = new ChatOpenAI({ modelName: opts?.modelName ?? 'gpt-4o-mini', temperature: 0 })
  const minScore = opts?.minScore ?? 0.15

  const run = async (query: string) => {
    const results = await storeManager.search(query, opts?.topK ?? 6)

    // filter by minScore for safety
    const filtered = results.filter((r: any) => (r.score ?? 0) >= minScore)

    if (!filtered.length) {
      // fallback: No good matches — ask for clarification OR perform web search
      return {
        answer:
          "I couldn't find reliable information in the documents. Can I search the web or do you want to clarify?",
        sources: [],
      }
    }

    // Build a compact context
    const context = filtered
      .map((r: any, idx: number) => `[[${idx}]] (${r.metadata?.source ?? 'unknown'})\n${r.text.slice(0, 800)}`)
      .join('\n\n')

    const prompt = `
You are an assistant. Use ONLY the context below to answer. If the answer is not present, say "I don't know".
Context:
${context}

Question: ${query}

Provide a short answer and then provide "Sources:" as a bullet list with the source name and excerpt.
    `

    const resp = await model.call(prompt)

    // return structured result
    return {
      answer: resp.text,
      sources: filtered.map((r: any) => ({
        source: r.metadata?.source,
        score: r.score,
        snippet: r.text.slice(0, 300),
      })),
    }
  }

  return { run }
}
```

---

## 🔁 Orchestration Example — Putting it all together

```ts
// src/rag/example/ragRunExample.ts
import { VectorStoreManager } from '../vectorStoreManager'
import { buildRagQAChain } from '../chains/ragQnAChain'
import { buildConversationalRag } from '../chains/conversationalRagChain'
import { buildRagWithCitations } from '../chains/ragWithCitations'
import { loadLocalDocuments } from '../ingestion/fileLoader'
import { chunkDocuments } from '../ingestion/chunker'
;(async () => {
  const docs = await loadLocalDocuments('./data')
  const chunks = await chunkDocuments(docs)
  const store = new VectorStoreManager('faiss')
  await store.init(chunks)

  const rag = buildRagWithCitations(store, { topK: 6, minScore: 0.18 })

  const q1 = 'What is the refund policy for returned shoes?'
  const res1 = await rag.run(q1)
  console.log('Answer:', res1.answer)
  console.log('Sources:', res1.sources)
})()
```

---

## 🚀 Production Notes, Patterns & Best Practices

1. **Prompt design**

   - Be explicit: tell model to use only supplied context.
   - Ask to include citations in a strict, parsable format (e.g., JSON or Markdown list).

2. **Token management**

   - Limit context length: join top-k but truncate per chunk to max chars/tokens.
   - Use summarization for long docs (summarize retrieved chunks before LLM call).

3. **Citations & traceability**

   - Return structured `sources` so the UI can link to original docs.
   - Save QA pairs with sources for later audit / training.

4. **Low confidence handling**

   - If top result scores < threshold → return “insufficient evidence” message.
   - Optionally trigger fallback flows: web search, ask clarification, or escalate to human reviewer.

5. **Safety & access control**

   - Filter docs by metadata — only allow authorized users to access confidential sources.
   - Redact PII before embedding or during retrieval if privacy rules require.

6. **Latency & UX**

   - If retrieval + LLM is slow, show incremental UI states: “Searching…”, “Found docs — generating answer…”
   - Stream LLM responses if supported by model → improves perceived latency.

7. **Monitoring & Eval**

   - Log: query, retrieved IDs, top-k scores, final answer, time taken.
   - Compute metrics: precision@k, hit rate, false positive rate (human feedback).

8. **Maintainability**

   - Keep prompt templates in separate files.
   - Keep retrieval and LLM logic separated so you can A/B models or stores.

9. **Testing**

   - Unit test chains with mocked retriever outputs.
   - Integration tests with a small local vector store and sample embeddings (use HF local models if API keys limited).

---

## ✅ Outcomes / Flashcards

|                 Concept | One-liner                                                    |
| ----------------------: | ------------------------------------------------------------ |
|               RAG Chain | Retriever + Prompt + LLM; combine retrieval with generation. |
|      Conversational RAG | Add memory (buffer/summary) to multi-turn retrieval.         |
|          Citation-first | Always include metadata so users can verify claims.          |
| Low-confidence fallback | If retrieval quality is low, decline or ask to search web.   |
|         Token budgeting | Limit chunk size & top-k to control token usage & cost.      |

---

## Next steps (recommended)

1. Run unit tests for RAG chain using **mock retriever outputs** (no API required). I can provide a mocking harness next.
2. Hook up `ragWithCitations` to a minimal UI (console or small React app) that shows answer + clickable sources.
3. After you’re comfortable, we’ll:

   - Implement evaluation harness (collect user feedback),
   - Add summarization step for long documents,
   - Integrate memory router (for hybrid chains in 5.2).

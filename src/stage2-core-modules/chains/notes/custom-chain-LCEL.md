# 🚀 LangChain Expression Language (LCEL) — Custom Chains

## 📖 Key Ideas

- **`RunnableSequence`**: Run steps **sequentially** (like a pipeline).
- **`RunnableParallel`**: Run steps **in parallel** (fan-out execution).
- **`RunnableBranch`**: Conditional branching (like `if-else`).
- **`RunnableMap`**: Apply different runnables to different keys of an object.
- **Operators**: `.map()`, `.pipe()`, `.withRetry()`, `.withFallbacks()`, `.batch()`.
- **Composability**: Each piece (LLM, prompt, retriever, tool, custom transform) is just a `Runnable`.

👉 The goal: You can build **custom pipelines** without waiting for LangChain to provide a dedicated chain class.

---

## 1. Sequential Workflow (RunnableSequence)

```ts
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'

// Step 1: Preprocess
const preprocess = (input: { query: string }) => ({
  question: input.query.trim().toLowerCase(),
})

// Step 2: Prompt
const prompt = PromptTemplate.fromTemplate('Answer in one line: {question}')

// Step 3: LLM
const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

// Chain
const chain = RunnableSequence.from([preprocess, prompt, llm])

;(async () => {
  const res = await chain.invoke({ query: '   WHAT is LangChain?? ' })
  console.log(res.content)
})()
```

🔹 Works like a pipeline: input → preprocess → prompt → LLM.

---

## 2. Parallel Workflow (RunnableParallel)

Use when you want **multiple outputs at once**.

```ts
import { RunnableParallel } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'

const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

const summaryPrompt = PromptTemplate.fromTemplate('Summarize: {text}')
const sentimentPrompt = PromptTemplate.fromTemplate('Sentiment (positive/negative): {text}')

const chain = RunnableParallel.from({
  summary: summaryPrompt.pipe(llm),
  sentiment: sentimentPrompt.pipe(llm),
})

;(async () => {
  const res = await chain.invoke({ text: 'I loved the movie but the ending was sad.' })
  console.log(res)
  // { summary: AIMessage {...}, sentiment: AIMessage {...} }
})()
```

🔹 Single input → fan-out → multiple analyses.

---

## 3. Branching (RunnableBranch)

Conditional routing (like RouterChain, but LCEL-native).

```ts
import { RunnableBranch } from '@langchain/core/runnables'

const branch = RunnableBranch.from([
  [(input: { query: string }) => input.query.includes('math'), async () => "I'll call the math solver"],
  [(input) => input.query.includes('history'), async () => "I'll fetch history notes"],
  [() => true, async () => 'Default: general query'],
])

;(async () => {
  console.log(await branch.invoke({ query: 'math problem 2+2' }))
  console.log(await branch.invoke({ query: 'history of Rome' }))
  console.log(await branch.invoke({ query: 'random chit-chat' }))
})()
```

🔹 Acts like a decision tree for queries.

---

## 4. Fallbacks & Retries

```ts
const primary = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })
const backup = new ChatOpenAI({ modelName: 'gpt-3.5-turbo', temperature: 0 })

const chain = primary.withFallbacks({ fallbacks: [backup] })

;(async () => {
  const res = await chain.invoke('Explain LangChain in 1 sentence')
  console.log(res.content)
})()
```

🔹 Ensures reliability — if one LLM fails, another takes over.

---

## 5. Custom Post-Processing

```ts
const chain = RunnableSequence.from([
  PromptTemplate.fromTemplate('Extract numbers: {text}').pipe(new ChatOpenAI({ modelName: 'gpt-4o-mini' })),
  async (msg) => {
    const content = msg.content as string
    return content.match(/\d+/g) || []
  },
])

;(async () => {
  const res = await chain.invoke({ text: 'I have 2 apples and 15 oranges' })
  console.log(res) // [ '2', '15' ]
})()
```

---

# 🎯 Why LCEL > Old Chains?

- You can replicate **RouterChain, MapReduceChain, TransformChain** etc.
- But with **more flexibility and cleaner syntax**.
- Future-proof: LangChain core is moving toward LCEL-first design.

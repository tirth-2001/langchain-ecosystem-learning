## 🧠 CombinedMemory – Theory

### What is it?

- `CombinedMemory` allows you to **merge multiple memory classes** together.
- Example: Use

  - `ConversationBufferWindowMemory` → keeps recent context (short-term memory)
  - `ConversationSummaryMemory` → compresses old context (long-term memory)

This mimics **human memory**:

- We recall the **recent few turns** easily (short-term).
- Older conversations are recalled via **summaries** (long-term).

---

### Why do we need it?

- **Scalability**: Pure buffer memory can grow huge → tokens explode.
- **Context efficiency**: Using both _summary + window_ gives balance.
- **Realistic chatbots**: They shouldn’t forget old context, but also shouldn’t carry 1000s of tokens in every prompt.

---

## 📝 Code Example: CombinedMemory

```ts
/**
 * src/stage2-chains/memory/combined-memory.ts
 *
 * Demo: CombinedMemory with BufferWindow + Summary
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { ConversationSummaryMemory } from 'langchain/memory'
import { ConversationBufferWindowMemory } from 'langchain/memory'
import { CombinedMemory } from 'langchain/memory'
import { PromptTemplate } from '@langchain/core/prompts'

async function runCombinedMemoryDemo() {
  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  })

  // 1. Long-term memory (summary)
  const summaryMemory = new ConversationSummaryMemory({
    llm,
    memoryKey: 'summary',
    returnMessages: true,
  })

  // 2. Short-term memory (window of last 2 exchanges)
  const windowMemory = new ConversationBufferWindowMemory({
    k: 2,
    memoryKey: 'recent_history',
    returnMessages: true,
  })

  // 3. Combine them
  const combinedMemory = new CombinedMemory({
    memories: [summaryMemory, windowMemory],
  })

  // 4. Use with ConversationChain
  const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant. 
Here is the summary of the conversation so far:
{summary}

Here are the recent messages:
{recent_history}

User: {input}
AI:
  `)

  const chain = new ConversationChain({
    llm,
    memory: combinedMemory,
    prompt,
  })

  // Demo
  await chain.call({ input: 'Hello, my name is Tirth.' })
  await chain.call({ input: 'I live in India and love coding.' })
  await chain.call({ input: 'What’s my name?' })
  await chain.call({ input: 'Where do I live?' })

  const final = await chain.call({ input: 'Can you summarize what you know about me?' })
  console.log('=== Final Answer ===')
  console.log(final.response)

  console.log('\n=== Memory State ===')
  console.log(await combinedMemory.loadMemoryVariables({}))
}

runCombinedMemoryDemo()
```

---

## 🔍 What this does

1. Keeps a **summary** of the entire conversation (`summary`).
2. Keeps the **last 2 exchanges** (`recent_history`).
3. Injects both into the prompt template.
4. The model answers with both short-term + long-term context.

---

## ✅ Expected Outcome

- It should **remember your name and location** via summary memory.
- It should **answer immediate recall questions** via window memory.
- Memory state will show **both keys**: `summary` and `recent_history`.

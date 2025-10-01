## 🔹 ConversationSummaryMemory

### 💡 Theory

- Instead of keeping **all messages** or **trimming them by k turns/tokens**, this memory stores a **summary** of the conversation so far.
- Uses an LLM to dynamically condense older history into a shorter text summary.
- Makes it possible to preserve **semantic continuity** of a long conversation without blowing up token usage.
- Particularly useful when you want the assistant to “remember the gist” but not every word.

---

### 🔹 Code Example

```ts
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { ConversationSummaryMemory } from 'langchain/memory'

async function runConversationSummaryMemory() {
  // 1. LLM
  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

  // 2. Prompt Template
  const prompt = PromptTemplate.fromTemplate(`
  You are a helpful assistant.
  Conversation summary so far:
  {history}

  Current question: {input}
  `)

  // 3. Memory (summarizes conversation instead of storing full)
  const memory = new ConversationSummaryMemory({
    llm,
    memoryKey: 'history',
    returnMessages: true,
  })

  // 4. Chain
  const chain = new ConversationChain({
    llm,
    prompt,
    memory,
  })

  // 5. Simulate conversation
  await chain.invoke({ input: 'Hi, I’m Tirth, I work as a software engineer.' })
  console.log('After Turn 1:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'I love coding in TypeScript and exploring GenAI.' })
  console.log('After Turn 2:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'I’m currently working on LangChain learning roadmap.' })
  console.log('After Turn 3:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'What do you know about me so far?' })
  console.log('After Turn 4:', await memory.loadMemoryVariables({}))
}

runConversationSummaryMemory()
```

---

### 🔹 Key Behavior

- Instead of a **growing conversation buffer**, `ConversationSummaryMemory` keeps a **running summary**.
- Old interactions are compressed into a paragraph summary using the LLM itself.
- You can check the summary at any time via `memory.loadMemoryVariables({})`.

---

✅ At this point, we’ve seen four different strategies:

1. **BufferMemory** → all turns.
2. **BufferWindowMemory** → last k turns.
3. **TokenBufferMemory** → history under token limit.
4. **SummaryMemory** → compressed history using LLM summarization.

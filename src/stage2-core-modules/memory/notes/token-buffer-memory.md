## 🔹 ConversationTokenBufferMemory

### 💡 Theory

- Instead of keeping fixed **turns** (`k`), this memory stores as much conversation history as will fit inside a **token budget**.
- Useful because LLMs don’t care about _turns_, but about _tokens_ (e.g., GPT-4o-mini has 128k context window).
- You define `maxTokenLimit`, and LangChain automatically prunes older messages when the token count exceeds this.

So it’s like **ConversationBufferWindowMemory**, but smarter — pruning is token-aware.

---

### 🔹 Code Example

```ts
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { ConversationTokenBufferMemory } from 'langchain/memory'

async function runConversationTokenBuffer() {
  // 1. LLM
  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

  // 2. Prompt Template
  const prompt = PromptTemplate.fromTemplate(`
  You are a helpful assistant.
  Conversation so far (trimmed by token limit):
  {history}

  Current question: {input}
  `)

  // 3. Memory (limit tokens instead of turns)
  const memory = new ConversationTokenBufferMemory({
    llm,
    maxTokenLimit: 50, // keep history under 50 tokens
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
  await chain.invoke({ input: 'Hi, I’m Tirth.' })
  console.log('After Turn 1:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'I live in India.' })
  console.log('After Turn 2:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'I love coding in TypeScript.' })
  console.log('After Turn 3:', await memory.loadMemoryVariables({}))

  await chain.invoke({ input: 'What’s my name?' })
  console.log('After Turn 4:', await memory.loadMemoryVariables({}))
}

runConversationTokenBuffer()
```

---

### 🔹 Key Behavior

- At the beginning, memory works like buffer memory (full history).
- As soon as accumulated tokens exceed `maxTokenLimit`, **oldest messages are pruned automatically**.
- This is more robust than `k`-based because `k=2` turns might be 10 tokens or 500 tokens depending on the user, but `maxTokenLimit` guarantees token safety for the LLM’s context window.

---

✅ So far:

- **BufferMemory** → keep _all_ history.
- **BufferWindowMemory** → keep _last k turns_.
- **TokenBufferMemory** → keep history under _token limit_.

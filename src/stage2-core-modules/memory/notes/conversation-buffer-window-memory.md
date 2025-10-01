# ConversationBufferWindowMemory

### 🔹 Theory

- **Problem with ConversationBufferMemory**:
  It stores the _entire_ chat history. For long conversations, this can cause:

  - Token overflow (LLM input size limit exceeded).
  - Slower performance.
  - Irrelevant context being passed.

- **Solution → ConversationBufferWindowMemory**

  - Instead of storing _all_ history, it only keeps the **last N exchanges** (sliding window).
  - Useful when **only recent context** matters.
  - You can configure how many turns (`k`) to retain.

---

### 🔹 Code Example (TypeScript)

```ts
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { ConversationBufferWindowMemory } from 'langchain/memory'

async function runConversationWindowMemory() {
  // 1. LLM
  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

  // 2. Define Prompt Template
  const prompt = PromptTemplate.fromTemplate(`
  You are a helpful assistant.
  Conversation history (last 2 turns only):
  {history}
  
  Current question: {input}
  `)

  // 3. Memory with sliding window (keep last 2 exchanges)
  const memory = new ConversationBufferWindowMemory({
    k: 2, // keep last 2 turns
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
  console.log(await chain.invoke({ input: 'Hi, I’m Tirth.' }))
  console.log(await chain.invoke({ input: 'I live in India.' }))
  console.log(await chain.invoke({ input: 'I love coding in TypeScript.' }))
  console.log(await chain.invoke({ input: 'Where do I live?' }))
  console.log(await chain.invoke({ input: 'What’s my name?' }))
}

runConversationWindowMemory()
```

---

### 🔹 Expected Behavior

- The **last 2 turns only** are remembered.
- So:

  - When asked _“Where do I live?”_ → it should answer correctly (_India_).
  - But when asked _“What’s my name?”_ → it might fail, because the name was outside the last 2 turns.

This demonstrates the trade-off of **short memory vs. full buffer memory**.

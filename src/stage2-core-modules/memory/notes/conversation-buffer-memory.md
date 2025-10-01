# ConversationBufferMemory

### **Theory**

- **What it is**:

  - A simple memory type in LangChain that stores the entire conversation as a buffer (list of messages).
  - Every new message gets appended → so when passed to the LLM, the full conversation history is available.

- **Key Behavior**:

  - Stores _all_ past interactions (can grow large).
  - Useful for short conversations or debugging to see the full context.
  - Not efficient for long-running chats (may hit token limits).

- **Structure**:

  - Behind the scenes, it maintains a list of `messages`:

    ```ts
    [
      { role: "human", content: "Hello!" },
      { role: "ai", content: "Hi! How can I help?" },
      ...
    ]
    ```

  - When LLM is called, LangChain injects these into the prompt template.

- **Important Options**:

  - `memoryKey`: key in the prompt where history is injected. Default: `"history"`.
  - `returnMessages`: if true → returns history as structured message objects; if false → returns as plain string.

---

### **Code (JS/TS Example)**

```ts
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { ConversationBufferMemory } from 'langchain/memory'

// 1. Define LLM
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
})

// 2. Create memory
const memory = new ConversationBufferMemory({
  memoryKey: 'chat_history', // name of variable injected into prompt
  returnMessages: true, // keep structure instead of plain text
})

// 3. Create conversation chain
const chain = new ConversationChain({
  llm,
  memory,
})

// 4. Run conversation
const response1 = await chain.call({ input: 'Hello, my name is Tirth.' })
console.log(response1)

const response2 = await chain.call({ input: 'Do you remember my name?' })
console.log(response2)
```

---

### **Expected Behavior**

1. First input: `"Hello, my name is Tirth."`
   → Model responds normally.
2. Second input: `"Do you remember my name?"`
   → Memory ensures model sees previous user message → should reply with `"Yes, your name is Tirth."`.

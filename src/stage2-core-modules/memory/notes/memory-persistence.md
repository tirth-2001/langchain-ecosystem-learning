## 🔹 Memory Persistence Approaches

### 1. **File-based (JSON) persistence**

- Easiest way.
- Save `chatHistory` or `memoryVariables` to a JSON file.
- Reload when restarting the bot.
- ✅ Great for demos & local projects.

---

### 2. **Database-backed persistence**

- Store memory in **Redis**, **MongoDB**, or **Postgres**.
- Each session/user can have a memory key.
- ✅ Production-ready, scalable, multi-user.
- Used in chatbots, virtual assistants, customer support bots.

---

### 3. **LangChain built-ins**

LangChain already provides some wrappers for persistence:

- **RedisChatMessageHistory**
- **PostgresChatMessageHistory**
- **MongoDBChatMessageHistory**
- These can be plugged directly into `ConversationChain` or any custom chain.

---

## 🔹 Example 1 – JSON Persistence

```ts
/**
 * src/stage2-chains/memory-persistence-json.ts
 * Simple persistence using JSON file
 */

import fs from 'fs'
import { ConversationChain } from 'langchain/chains'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationBufferMemory } from 'langchain/memory'

const MEMORY_FILE = 'chat-memory.json'

// Load persisted memory
function loadMemory() {
  if (fs.existsSync(MEMORY_FILE)) {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'))
  }
  return { chatHistory: [] }
}

// Save memory to file
function saveMemory(memoryData: any) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryData, null, 2))
}

async function run() {
  const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

  const memory = new ConversationBufferMemory({
    returnMessages: true,
    chatHistory: loadMemory().chatHistory || [],
  })

  const chain = new ConversationChain({ llm, memory })

  // Interaction 1
  const res1 = await chain.invoke({ input: "Hi, I'm Alex." })
  console.log('Bot:', res1.response)

  // Interaction 2
  const res2 = await chain.invoke({ input: "What's my name?" })
  console.log('Bot:', res2.response)

  // Persist memory after session
  saveMemory(await memory.loadMemoryVariables({}))
}

run()
```

👉 Run twice:

- On first run, it learns “I’m Alex.”
- On second run, it **remembers Alex** because memory got saved to `chat-memory.json`.

---

## 🔹 Example 2 – Redis Persistence

```ts
/**
 * src/stage2-chains/memory-persistence-redis.ts
 */

import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { RedisChatMessageHistory } from 'langchain/stores/message/redis'
import { ConversationBufferMemory } from 'langchain/memory'
import { createClient } from 'redis'

async function run() {
  // Redis connection
  const redisClient = createClient({ url: 'redis://localhost:6379' })
  await redisClient.connect()

  // Wrap Redis in LangChain message history
  const messageHistory = new RedisChatMessageHistory({
    sessionId: 'user-123', // one per user/session
    client: redisClient,
  })

  const memory = new ConversationBufferMemory({
    returnMessages: true,
    chatHistory: messageHistory,
  })

  const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

  const chain = new ConversationChain({ llm, memory })

  const res = await chain.invoke({ input: 'Remind me that I like pizza 🍕' })
  console.log('Bot:', res.response)

  const res2 = await chain.invoke({ input: 'What food do I like?' })
  console.log('Bot:', res2.response)

  await redisClient.quit()
}

run()
```

👉 With Redis, memory survives **across restarts, multi-user sessions, even across servers**.

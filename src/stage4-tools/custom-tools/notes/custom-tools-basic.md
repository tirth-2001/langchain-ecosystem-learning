## 🧭 Stage 3.3.3 — Creating Custom Tools

### 🎯 Objective

Understand how to build, structure, and manage **custom tools** that connect an agent to your business logic, APIs, or systems (like databases, file services, CRMs, or proprietary APIs).

---

## 🧩 1. Theory — Anatomy of a Custom Tool

LangChain’s tool system revolves around a few key abstractions:

| Concept                      | Description                                                                                         | Example                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **`Tool` (Base class)**      | Simplest form — define a name, description, and a synchronous/asynchronous `call()` method.         | Good for plain JS logic.                  |
| **`DynamicStructuredTool`**  | Enhanced version using a **Zod schema** to enforce structured input/output and improve reliability. | Best for production-grade tools.          |
| **`Toolkit`**                | Logical grouping of related tools (like a CRM toolkit or File toolkit).                             | Used for modular design.                  |
| **`createToolCallingAgent`** | The mechanism that lets the LLM _see_ tool schemas and decide when to call them.                    | Integrates your tool with reasoning loop. |

---

### 🧠 Key Principles of Tool Design

1. **Declarative description matters**
   The LLM doesn’t read your code — it reads your _tool name_ and _description_.
   So write descriptions like you would document a public API.

2. **Schema = Clarity**
   Use `zod` schemas to define input arguments.
   This ensures the LLM provides valid structured data (not just free text).

3. **Stateless > Stateful (usually)**
   Each tool call should ideally be stateless.
   Use memory/DB connectors for context persistence.

4. **LLM → Tool → Environment**

   ```
   LLM (decides what to do)
        ↓
     Tool (executes function)
        ↓
     External API / DB / SDK
   ```

---

## ⚒️ 2. Example 1 — Custom “Library System” Tool (API-based)

### 🧩 Use Case

Let’s say you have a Library Management API that exposes:

- `GET /books?title=xyz` → returns book info
- `POST /borrow` → borrow a book
- `GET /users/{id}/borrowed` → list user’s borrowed books

We’ll build a **custom tool** that lets an agent **query books and borrow one** via this API.

---

### 🧠 Step-by-Step Flow

1. Define input schema for `BookLookupTool`.
2. Implement `call()` to query your REST API using `fetch`.
3. Add to `tools` array and invoke through agent.

---

### 💻 TypeScript Implementation

```typescript
import 'dotenv/config'
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'

// 1️⃣ Custom Tool: Book Search from Library API
const LibraryBookLookupTool = new DynamicStructuredTool({
  name: 'library_book_lookup',
  description: 'Search for a book in the Library System by title. Returns book title, author, and availability status.',
  schema: z.object({
    title: z.string().describe('Title of the book to search for'),
  }),
  func: async ({ title }) => {
    try {
      const response = await fetch(`https://api.examplelibrary.com/books?title=${encodeURIComponent(title)}`, {
        headers: {
          Authorization: `Bearer ${process.env.LIBRARY_API_KEY}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch book data')

      const data = await response.json()
      const topBook = data[0]

      return `Book: ${topBook.title} by ${topBook.author}. Availability: ${
        topBook.available ? 'Available' : 'Checked out'
      }.`
    } catch (err) {
      return `Error fetching book info: ${err}`
    }
  },
})

// 2️⃣ Optional: Borrow Book Tool
const LibraryBorrowTool = new DynamicStructuredTool({
  name: 'library_borrow_book',
  description: 'Borrow a book from the Library System using its book ID and user ID.',
  schema: z.object({
    userId: z.string().describe('Library user ID'),
    bookId: z.string().describe('Book ID to borrow'),
  }),
  func: async ({ userId, bookId }) => {
    try {
      const res = await fetch('https://api.examplelibrary.com/borrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LIBRARY_API_KEY}`,
        },
        body: JSON.stringify({ userId, bookId }),
      })

      if (!res.ok) throw new Error(`Failed to borrow book`)

      const result = await res.json()
      return `✅ Borrowed successfully. Transaction ID: ${result.txId}`
    } catch (err) {
      return `Borrow failed: ${err}`
    }
  },
})

// 3️⃣ Combine with model + agent
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.2,
})

const tools = [LibraryBookLookupTool, LibraryBorrowTool]

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a library assistant that helps users find and borrow books.'],
  ['human', '{input}'],
  new MessagesPlaceholder('agent_scratchpad'),
])

const runAgent = async () => {
  const agent = await createToolCallingAgent({ llm: model, tools, prompt })
  const executor = new AgentExecutor({ agent, tools, verbose: true })

  const result = await executor.invoke({
    input: 'Find the book "Atomic Habits" and borrow it for user ID 12345.',
  })

  console.log('Final Response:', result.output)
}

runAgent().catch(console.error)
```

---

### 🧠 What You Learned Here

✅ How to define structured input for LLMs using `zod`
✅ How to integrate a **real-world REST API** securely
✅ How to chain multiple actions (search → borrow)
✅ How to make the agent’s description human-intelligible for LLM reasoning

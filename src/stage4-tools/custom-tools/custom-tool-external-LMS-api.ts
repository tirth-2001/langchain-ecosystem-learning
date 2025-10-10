/**
 * Stage 4 – Tools: Custom External LMS API Tool
 * Micro-project: Integration with external Learning Management System API
 *
 * Objectives:
 * 1. Create custom tools that interact with external REST APIs
 * 2. Implement structured input validation using Zod schemas
 * 3. Demonstrate error handling and API response processing
 *
 * Core Concepts Covered:
 * - `DynamicStructuredTool` with Zod validation
 * - External API integration patterns
 * - Error handling for API failures
 * - Structured tool inputs and outputs
 */

import 'dotenv/config'
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'

const searchBookSchema = z.object({
  title: z.string().describe('Title of the book to search for'),
})

const borrowBookSchema = z.object({
  userId: z.string().describe('Library user ID'),
  bookId: z.string().describe('Book ID to borrow'),
})

// 1️⃣ Custom Tool: Book Search from Library API
const LibraryBookLookupTool = new DynamicStructuredTool({
  name: 'library_book_lookup',
  description: 'Search for a book in the Library System by title. Returns book title, author, and availability status.',
  schema: searchBookSchema,
  func: async (input) => {
    try {
      const { title } = searchBookSchema.parse(input)
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
  schema: borrowBookSchema,
  func: async (input) => {
    try {
      const { bookId, userId } = borrowBookSchema.parse(input)
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

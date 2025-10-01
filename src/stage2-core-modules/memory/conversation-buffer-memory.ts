/**
 * Demo: ConversationBufferMemory with LLMChain
 *
 * - LLM (ChatOpenAI)           → the engine
 * - ConversationBufferMemory    → remembers all history
 * - PromptTemplate              → shows how history is injected
 * - ConversationChain           → glues everything together
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { BufferMemory } from 'langchain/memory'

// 1. Define LLM
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini', // or "gpt-4o", "gpt-3.5-turbo"
  temperature: 0.7,
})

// 2. Create memory
const memory = new BufferMemory({
  memoryKey: 'chat_history', // key to be replaced in prompt
  returnMessages: true, // return messages instead of plain string
})

// 3. Create prompt template
const template = `You are a helpful AI assistant.
Use the following conversation history and the new human input to reply.

Conversation so far:
{chat_history}

Human: {input}
AI:`

const prompt = PromptTemplate.fromTemplate(template)

// 4. Create chain
const chain = new ConversationChain({
  llm,
  memory,
  prompt,
})

// 5. Run conversation
async function runConversation() {
  const res1 = await chain.call({ input: 'Hello, my name is Tirth.' })
  console.log('AI Response 1:', res1.response)

  const res2 = await chain.call({ input: 'Do you remember my name?' })
  console.log('AI Response 2:', res2.response)

  const res3 = await chain.call({ input: 'What did I say at the beginning?' })
  console.log('AI Response 3:', res3.response)

  const res4 = await chain.call({ input: 'Total how many times you had covered my name in your responses yet?' })
  console.log('AI Response 4:', res4.response)
}

runConversation()

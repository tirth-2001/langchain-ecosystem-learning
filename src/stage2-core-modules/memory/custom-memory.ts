/**
 * Stage 2 – Core Modules: Custom Memory Demo
 * Micro-project: Storing only user inputs in conversation memory
 *
 * Objectives:
 * 1. Demonstrate how to create a custom memory class by extending BaseMemory
 * 2. Show how to store only user queries (ignoring AI responses)
 * 3. Integrate custom memory with ConversationChain and PromptTemplate
 *
 * Core Concepts Covered:
 * - Custom memory: controlling what is stored and exposed to the prompt
 * - loadMemoryVariables: how memory is injected into the LLM prompt
 * - saveContext: how to update memory after each interaction
 * - Practical usage in a conversation chain
 */

import 'dotenv/config'
import { BaseMemory, InputValues, OutputValues } from 'langchain/memory'
import { ChatOpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'

class UserOnlyMemory extends BaseMemory {
  private userInputs: string[] = []

  // 1️⃣ Define memory keys (what variables are exposed to the prompt)
  get memoryKeys(): string[] {
    return ['user_history']
  }

  // 2️⃣ Load memory for the prompt
  async loadMemoryVariables(_inputs: InputValues): Promise<Record<string, any>> {
    return {
      user_history: this.userInputs.join('\n'),
    }
  }

  // 3️⃣ Save only user inputs (ignore outputs)
  async saveContext(inputs: InputValues, _outputs: OutputValues): Promise<void> {
    if (inputs?.input) {
      this.userInputs.push(inputs.input as string)
    }
  }

  // 4️⃣ Clear memory
  async clear(): Promise<void> {
    this.userInputs = []
  }
}

const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

const prompt = PromptTemplate.fromTemplate(
  `You are a chatbot. The user has previously said:\n{user_history}\n\nNow respond to: {input}`,
)

const memory = new UserOnlyMemory()

const chain = new ConversationChain({
  llm,
  prompt,
  memory,
})

// === Usage Demo ===
async function runCustomMemoryDemo() {
  // First interaction
  const res1 = await chain.invoke({ input: 'Hello, I like football.' })
  console.log('AI:', res1)
  console.log('Memory:', await memory.loadMemoryVariables({}))

  // Second interaction
  const res2 = await chain.invoke({ input: 'What sport did I mention?' })
  console.log('AI:', res2)
  console.log('Memory:', await memory.loadMemoryVariables({}))
}

runCustomMemoryDemo().catch(console.error)

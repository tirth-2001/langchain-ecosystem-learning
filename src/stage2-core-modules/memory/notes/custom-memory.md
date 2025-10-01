# 🔹 Custom Memory in LangChain

## 1. Theory

- All memory classes in LangChain inherit from **`BaseMemory`**.
- To create a custom memory, you:

  1. Extend `BaseMemory`.
  2. Implement at least these methods:

     - `loadMemoryVariables(inputs)` → returns the memory state (dict).
     - `saveContext(inputs, outputs)` → updates memory with new interaction.
     - `clear()` → clears stored memory.

  3. (Optional) Define your own storage logic — JSON, DB, API, etc.

📌 **Why Custom Memory?**

- Default ones (buffer, window, token buffer, summary) may not fit all use cases.
- Examples:

  - Store **only user queries**, not assistant responses.
  - Anonymize personal info before saving.
  - Store memory in a **graph database** for relationship reasoning.

---

## 2. Demo – Minimal Custom Memory

```ts
/**
 * src/stage2-core-modules/memory/custom-memory.ts
 *
 * Custom Memory Demo:
 * - Stores only user inputs (ignores AI responses).
 * - Exposes history back into the prompt.
 */

import { BaseMemory, InputValues, OutputValues } from 'langchain/memory'
import { ChatOpenAI } from '@langchain/openai'
import { LLMChain } from 'langchain/chains'
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

// === Usage Demo ===
async function runCustomMemoryDemo() {
  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

  const prompt = new PromptTemplate({
    template: `You are a chatbot. The user has previously said:\n{user_history}\n\nNow respond to: {input}`,
    inputVariables: ['user_history', 'input'],
  })

  const memory = new UserOnlyMemory()

  const chain = new LLMChain({
    llm,
    prompt,
    memory,
  })

  // First interaction
  const res1 = await chain.invoke({ input: 'Hello, I like football.' })
  console.log('AI:', res1)

  // Second interaction
  const res2 = await chain.invoke({ input: 'What sport did I mention?' })
  console.log('AI:', res2)
}

runCustomMemoryDemo().catch(console.error)
```

---

## 3. Explanation

- **UserOnlyMemory** → keeps only user messages, not AI outputs.
- Memory variable exposed to the prompt is **`user_history`**.
- Prompt shows prior user inputs, then asks AI to respond.

### Example Run

```txt
User: Hello, I like football.
AI: Nice! Football is a great sport. Do you play or just watch it?

User: What sport did I mention?
AI: You mentioned football.
```

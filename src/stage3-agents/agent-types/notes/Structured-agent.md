# 🎯 Structured Agents in LangChain

## 🔹 1. Core Idea

- Traditional agents (like **ReAct**) rely on **free-form text parsing** to extract `Action` and `Action Input` from LLM outputs.
- This is **fragile**: small format deviations can break the loop.
- Structured Agents solve this by making the LLM output **structured JSON/function calls**, enforced by a schema.

Think of it as:
👉 “Instead of parsing text, just ask the LLM to return a **function call object**.”

---

## 🔹 2. Key Components

1. **Structured Tool Interface**

   - Tools declare their **input schema** (e.g., Zod / JSON Schema).
   - The agent can only call tools with valid structured arguments.

2. **Agent Execution**

   - The LLM is prompted to return an object like:

     ```json
     {
       "tool": "calculator",
       "args": { "expression": "2 + 2" }
     }
     ```

   - No ambiguity, no brittle parsing.

3. **Benefits**

   - More **robust** (no regex parsing).
   - Compatible with **function-calling models** (like OpenAI GPT function calling, Anthropic tool use).
   - Easier to debug, extend, and integrate.

---

## 🔹 3. When to Use Structured Agents?

- When you need **strong control** over the format of tool calls.
- For production systems where fragile ReAct parsing isn’t safe.
- When your LLM natively supports structured outputs (e.g., GPT-4 function calling).

---

# 📝 TypeScript Demo: `structured-agent.ts`

Here’s a **clean demo** using LangChainJS (latest APIs):

```ts
// structured-agent.ts
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { createStructuredChatAgent, AgentExecutor } from 'langchain/agents'

// 1. Define Tools with Structured Schema
const calculator = new DynamicStructuredTool({
  name: 'calculator',
  description: 'Evaluate a simple math expression',
  schema: z.object({
    expression: z.string().describe("A math expression to evaluate, e.g., '2 + 2'"),
  }),
  func: async ({ expression }) => {
    try {
      return eval(expression).toString() // ⚠️ simplified; avoid eval in prod
    } catch (err) {
      return 'Error evaluating expression'
    }
  },
})

const translator = new DynamicStructuredTool({
  name: 'translator',
  description: 'Translate English text to French',
  schema: z.object({
    text: z.string().describe('The English text to translate'),
  }),
  func: async ({ text }) => {
    // Dummy translator for demo
    return `FR(${text})`
  },
})

// 2. Define LLM
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini', // function-calling model
  temperature: 0,
})

// 3. Create Structured Agent
const agent = createStructuredChatAgent({
  llm,
  tools: [calculator, translator],
  prompt: undefined, // default structured agent prompt
})

// 4. Wrap in Executor
const executor = new AgentExecutor({
  agent,
  tools: [calculator, translator],
  verbose: true,
})

// 5. Run Agent
async function run() {
  const result = await executor.invoke({
    input: "Translate 'I have 2 apples and 3 bananas' into French, but first calculate 2+3",
  })

  console.log('=== Structured Agent Output ===')
  console.log(result.output)
}

run()
```

---

## 🔹 4. Expected Behavior

1. The agent first decides it needs the calculator:

   ```json
   { "tool": "calculator", "args": { "expression": "2+3" } }
   ```

2. Gets result = 5.
3. Then calls translator:

   ```json
   { "tool": "translator", "args": { "text": "I have 5 fruits" } }
   ```

4. Final Answer: `FR(I have 5 fruits)`

---

✅ With this, you see the **difference from ReAct**:

- Instead of messy free-form prompts, the LLM outputs **structured JSON tool calls** enforced by schema.

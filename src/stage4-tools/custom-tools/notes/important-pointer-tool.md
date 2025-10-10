# 🔹 3.3.1 – Tools Overview & Anatomy (Wrap-up)

---

## 1. Error Handling in Tools

### 📘 Theory

- Tools should never silently fail — instead, return a clear error message.
- LangChain will propagate tool errors up to the agent loop.
- Best practice: **validate inputs with Zod** and **catch runtime errors**.
- This avoids the dreaded _"Received tool input did not match expected schema"_ errors we saw earlier.

### 💻 Example

```ts
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

const safeCalculator = new DynamicStructuredTool({
  name: 'safe_calculator',
  description: 'Safely evaluate a simple math expression',
  schema: z.object({
    expression: z.string().describe("Math expression, e.g. '10 / 2'"),
  }),
  func: async (input) => {
    try {
      const { expression } = z.object({ expression: z.string() }).parse(input)
      // avoid eval in production – here for demo
      const result = eval(expression)
      if (isNaN(result)) throw new Error('Invalid math expression')
      return JSON.stringify({ success: true, result })
    } catch (err: any) {
      return JSON.stringify({ success: false, error: err.message })
    }
  },
})
```

✅ Even if LLM sends a bad schema, we’ll return a clean error object instead of crashing.

---

## 2. Tool Return Values

### 📘 Theory

- Tools can return **plain strings** (default) or **structured JSON**.
- Returning structured JSON makes chaining easier (other tools or code can consume).
- Keep it **consistent**: don’t mix freeform text + JSON unless required.

### 💻 Example

```ts
const translator = new DynamicStructuredTool({
  name: 'translator',
  description: 'Translate English text to French',
  schema: z.object({
    text: z.string().describe('English sentence to translate'),
  }),
  func: async ({ text }) => {
    return JSON.stringify({
      input: text,
      translated: `FR(${text})`, // dummy translator
    })
  },
})
```

Output will always be structured:

```json
{ "input": "Hello", "translated": "FR(Hello)" }
```

---

## 3. Tool Metadata

### 📘 Theory

Some useful metadata fields:

- `returnDirect`: If `true`, skips reasoning loop → agent immediately returns tool’s output.
  Example: For a “get weather” tool where you want the raw API result.
- `tags`: Helpful in debugging / observability (LangSmith traces).

### 💻 Example

```ts
const weatherLookup = new DynamicStructuredTool({
  name: 'weather_lookup',
  description: 'Fetch weather by city',
  schema: z.object({ city: z.string() }),
  func: async ({ city }) => {
    return `Sunny in ${city}, 25°C`
  },
  returnDirect: true, // skips agent loop
  tags: ['weather', 'demo'],
})
```

If the agent calls `weather_lookup`, the output is returned directly as the final answer.

---

## 4. Cross-LLM Behavior

### 📘 Theory

- **OpenAI models** (e.g., GPT-4, GPT-4o-mini): use **native function calling**.

  - Tool schemas map directly to OpenAI’s `functions` API.
  - LLM decides args based on schema.

- **Other models** (Anthropic, Mistral, Ollama): LangChain **simulates function calling**.

  - Uses prompt engineering + output parsing to coerce schema.

- ✅ Good news: You **don’t have to change tool code** — LangChain abstracts it.

### 💡 Takeaway

Your `DynamicStructuredTool` will work across providers, but reliability may vary:

- OpenAI → most consistent
- Others → depends on parsing & prompt strictness

---

# 🎯 Closing Notes for 3.3.1

- Tools are **LLM-usable functions**; schema is the contract.
- Always use **Zod schemas** + **safe parsing**.
- Decide between **string vs JSON return** based on downstream needs.
- `returnDirect` is powerful for “final answer” tools.
- Cross-LLM works, but schema adherence is strongest with OpenAI function calling.

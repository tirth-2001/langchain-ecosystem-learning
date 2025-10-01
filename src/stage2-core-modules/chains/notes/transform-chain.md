# **TransformChain**

### 📖 Theory

- **Purpose**: A lightweight wrapper to transform input/output dictionaries between steps in a chain.
- Think of it like middleware: regex cleaning, lowercasing, adding metadata, formatting, or extracting fields.
- It doesn’t call the LLM — just manipulates data before or after LLM steps.

### ✅ Example use cases

- Normalize user input (`"Hello WORLD!!!"` → `"hello world"`).
- Extract structured fields (e.g., parse dates).
- Pre/post-process prompts or LLM outputs.

---

### 🧑‍💻 TypeScript Example

```ts
import { TransformChain } from 'langchain/chains'

// Example: lowercase + strip punctuation
const transformChain = new TransformChain({
  inputVariables: ['text'],
  outputVariables: ['cleanText'],
  transform: async (values: Record<string, any>) => {
    let text = values.text as string
    text = text.toLowerCase().replace(/[^\w\s]/g, '')
    return { cleanText: text }
  },
})

// Run it
;(async () => {
  const result = await transformChain.call({ text: "Hello WORLD!!! How's it going?" })
  console.log(result)
  // { cleanText: 'hello world hows it going' }
})()
```

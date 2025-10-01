# 🔹 Theory: OutputParsers

### 1. What they are

When you ask an LLM a question, the output is just **raw text**.
But in many real-world apps, you need **structured data** (JSON, numbers, categories, objects).
👉 **OutputParsers** are utilities that **parse and validate** LLM responses into structured formats.

### 2. Why we need them

- Raw LLM text → inconsistent, verbose, error-prone.
- Applications need **deterministic formats** (e.g., API expects JSON).
- Parsers enforce formatting and **reduce errors** downstream.

### 3. Types of OutputParsers

1. **Simple parsing**

   - `CommaSeparatedListOutputParser` → converts `"apple, banana, mango"` → `["apple", "banana", "mango"]`.
   - `BooleanOutputParser` → ensures `"yes/no"` → `true/false`.

2. **Structured parsing (schemas)**

   - `StructuredOutputParser` → enforces schema via Zod or Pydantic (TS/JS use Zod).
   - Helps keep LLM’s output in **strict JSON with validation**.

3. **Custom OutputParsers**

   - You can subclass and implement `.parse()` for special needs (e.g., extract numbers, regex-based parsing).

---

# 🔹 Code Example: Simple OutputParser

```ts
import { CommaSeparatedListOutputParser } from '@langchain/core/output_parsers'

const parser = new CommaSeparatedListOutputParser()

const rawOutput = 'apple, banana, mango'
const parsed = await parser.parse(rawOutput)

console.log(parsed) // ["apple", "banana", "mango"]
```

---

# 🔹 Code Example: StructuredOutputParser (with Zod)

```ts
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'

// Define schema
const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    sentiment: z.enum(['positive', 'neutral', 'negative']),
    summary: z.string(),
  }),
)

// Instruction string (to include in prompt!)
const formatInstructions = parser.getFormatInstructions()

console.log(formatInstructions)
/*
Your response should be a JSON object with the following structure:
{"sentiment": "positive" | "neutral" | "negative", "summary": "string"}
*/

// Example LLM usage
const fakeLLMOutput = `{"sentiment": "positive", "summary": "The product is great!"}`

const parsed = await parser.parse(fakeLLMOutput)
console.log(parsed)
// { sentiment: "positive", summary: "The product is great!" }
```

---

# 🔹 Code Example: Combining with PromptTemplate

```ts
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'

// Schema for parser
const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    language: z.string(),
    greeting: z.string(),
  }),
)

// Attach parser's formatting instructions to the prompt
const formatInstructions = parser.getFormatInstructions()

const prompt = ChatPromptTemplate.fromTemplate(`
Translate "Hello" into {language}.
{format_instructions}
`)

const formattedPrompt = await prompt.format({
  language: 'French',
  format_instructions: formatInstructions,
})

console.log(formattedPrompt)
/*
Translate "Hello" into French.
Your response should be a JSON object with the following structure:
{"language": "string", "greeting": "string"}
*/
```

At runtime, the LLM will return JSON, and the **parser guarantees it parses correctly**.

---

# 🔹 Key Takeaways

- Use **simple parsers** when you just need list/boolean/number conversion.
- Use **structured parsers** with Zod when integrating into apps that need reliable structured outputs.
- Always include `parser.getFormatInstructions()` in your **prompt**, so the LLM knows the expected output shape.

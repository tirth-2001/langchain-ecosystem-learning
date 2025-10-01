## 📘 Theory: `ChatPromptTemplate`

In LangChain, prompts aren’t just static strings — they can be structured into **roles + messages**. This is where `ChatPromptTemplate` comes in.

It allows you to create **chat-based prompts** with multiple messages (system, human, AI, etc.), and then pass them into a `ChatModel` (like `ChatOpenAI`).

---

### 🔑 Key Points

1. **Role-based messages**

   - `system` → sets context & behavior of the AI
   - `human` → user input
   - `ai` → model’s previous response (used in conversations)
   - `function` / `tool` → special cases when calling tools

2. **Templates with Variables**

   ```ts
   ChatPromptTemplate.fromMessages([
     ['system', 'You are a helpful assistant that translates English to {language}.'],
     ['human', '{text}'],
   ])
   ```

3. **Flexibility**

   - Dynamic placeholders (`{text}`, `{language}`)
   - Reusable templates
   - Supports **multi-turn conversations**

4. **Difference from `PromptTemplate`**

   - `PromptTemplate` → single block of text
   - `ChatPromptTemplate` → structured dialogue with roles

---

## 📝 Code Demo

Let’s build a **multi-role prompt** that:

1. Sets the assistant role via `system` message
2. Accepts dynamic user input
3. Demonstrates multi-turn style conversation

```ts
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

// 1️⃣ Define ChatPromptTemplate
const chatPrompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant that always responds in a polite tone.'],
  ['human', 'Translate the following text into {language}: {text}'],
])

// 2️⃣ Build chain: Prompt → LLM → Parser
const chain = chatPrompt.pipe(new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })).pipe(new StringOutputParser())

// 3️⃣ Run demo
async function runDemo() {
  const result1 = await chain.invoke({
    language: 'French',
    text: 'Good morning, how are you?',
  })
  console.log('➡️ Translation to French:\n', result1)

  const result2 = await chain.invoke({
    language: 'Spanish',
    text: 'I am learning LangChain step by step.',
  })
  console.log('➡️ Translation to Spanish:\n', result2)
}

runDemo().catch(console.error)
```

---

## ✅ Expected Outcome

- The model will **translate dynamically** into the specified language.
- `ChatPromptTemplate` ensures role separation (system = context, human = query).
- Demonstrates **multi-variable templating** in chat prompts.

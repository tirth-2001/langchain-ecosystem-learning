## 📘 Theory: `MessagePromptTemplate`

- `ChatPromptTemplate` is the **container** for multiple messages.
- `MessagePromptTemplate` is the **individual unit** that defines one message with a role (`system`, `human`, `ai`, `function`, etc.).
- You can mix & match these to dynamically build a conversation prompt.

---

### 🔑 Why use it?

1. **Granular control** → define each message separately and then combine them.
2. **Dynamic message creation** → generate human/AI messages in a loop, or load them from memory.
3. **More reusable** → e.g., create a `systemPrompt` once and reuse across different conversations.

---

### 📝 Code Demo: MessagePromptTemplate in Action

```ts
/**
 * src/stage2-chains/message-prompt-template.ts
 *
 * Demo of MessagePromptTemplate
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  AIMessagePromptTemplate,
} from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

// 1️⃣ Create individual message templates
const systemMessage = SystemMessagePromptTemplate.fromTemplate(
  'You are a helpful assistant that provides {tone} answers.',
)

const humanMessage = HumanMessagePromptTemplate.fromTemplate('Please answer the following question: {question}')

const aiMessage = AIMessagePromptTemplate.fromTemplate('Here is my prior answer: {previousAnswer}')

// 2️⃣ Combine into ChatPromptTemplate
const chatPrompt = ChatPromptTemplate.fromMessages([systemMessage, humanMessage, aiMessage])

// 3️⃣ Build chain: Prompt → LLM → Parser
const chain = chatPrompt.pipe(new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })).pipe(new StringOutputParser())

// 4️⃣ Run demo
async function runDemo() {
  const response = await chain.invoke({
    tone: 'concise',
    question: 'What is the capital of Japan?',
    previousAnswer: 'Last time, I incorrectly said Kyoto.',
  })

  console.log('➡️ Final Answer:\n', response)
}

runDemo().catch(console.error)
```

---

### ✅ Expected Outcome

- `systemMessage` enforces tone (“concise” or “detailed”).
- `humanMessage` injects the actual user question.
- `aiMessage` shows how you can include previous AI responses (helpful for memory & corrections).
- Together, they form a **multi-role, dynamic conversation prompt**.

---

👉 In practice, `MessagePromptTemplate` is often used by **Memory modules** — which automatically inject `human` + `ai` history as messages, so you don’t need to manually stitch them every time.

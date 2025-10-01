# 🧠 Entity Memory

## 1. Concept & Theory

- **Entity Memory** is a specialized memory class that focuses on **tracking facts about entities** (people, places, objects) across a conversation.
- Unlike `ConversationBufferMemory` (stores raw conversation) or `ConversationSummaryMemory` (summarizes), Entity Memory builds a **knowledge base of entities and their attributes**.
- Example:

  ```
  User: Alice likes pizza.
  Memory: Entity = Alice, Fact = likes pizza
  ```

  Later:

  ```
  User: What does Alice like?
  Memory recalls: pizza
  ```

- This makes it valuable for **personalized assistants**, **role-playing bots**, **customer service**, and **NPCs in games**.

---

## 2. Basic Example

```ts
import { OpenAI } from '@langchain/openai'
import { ConversationChain } from 'langchain/chains'
import { EntityMemory } from 'langchain/memory'

// Initialize LLM
const llm = new OpenAI({
  temperature: 0,
  model: 'gpt-3.5-turbo',
})

// Setup Entity Memory
const memory = new EntityMemory({
  llm,
  returnMessages: true,
})

// Create chain
const chain = new ConversationChain({
  llm,
  memory,
})

// Example conversation
async function run() {
  console.log(await chain.call({ input: 'Alice likes pizza and lives in Paris.' }))
  console.log(await chain.call({ input: 'What does Alice like?' }))
  console.log(await chain.call({ input: 'Where does Alice live?' }))
}

run()
```

### Expected Behavior:

- On first input, Entity Memory extracts facts:
  `Alice -> likes pizza, lives in Paris`
- On subsequent queries, it recalls these facts correctly.

---

## 3. Inspecting Stored Entities

You can **peek inside the memory** to see what’s stored:

```ts
console.log('Stored Entities:', memory.entityStore.store)
```

Example output:

```json
{
  "Alice": "Alice likes pizza and lives in Paris."
}
```

This helps debug what facts are being captured.

---

## 4. Extended Example with Prompt Template

We can **customize prompts** to make the LLM use entity facts more explicitly:

```ts
import { PromptTemplate } from 'langchain/prompts'

const template = `You are a helpful assistant.
Use facts about entities when answering.
Conversation so far:
{history}
User: {input}
AI:`

const prompt = new PromptTemplate({
  template,
  inputVariables: ['history', 'input'],
})

const chainWithPrompt = new ConversationChain({
  llm,
  memory,
  prompt,
})

async function runCustom() {
  await chainWithPrompt.call({ input: 'Bob is a doctor and plays guitar.' })
  const res = await chainWithPrompt.call({ input: 'What does Bob do?' })
  console.log(res.response)
}

runCustom()
```

Here, the **prompt ensures** entity knowledge is explicitly used in reasoning.

---

## 5. Limitations & Best Practices

- **Strengths:**

  - Great for scenarios requiring long-term memory of **specific entities**.
  - Lightweight alternative to vector stores if entities are well-structured.

- **Limitations:**

  - Not ideal for **large-scale knowledge bases** — it may miss or overwrite details.
  - Quality depends on the **LLM’s ability to extract entities correctly**.

- **Best Practices:**

  - Use for **personal assistants, games, conversational personalization**.
  - For **large document/question answering**, prefer **VectorStore-backed memory** (covered in Stage 5 RAG, but we also mentioned it under Stage 2.3).
  - Combine with `CombinedMemory` for richer behavior (e.g., entity + conversation summary).

---

✅ **Checklist for Entity Memory (done in this response):**

- [x] Theory explanation
- [x] Basic working example
- [x] Inspect stored entities
- [x] Extended example with prompt template
- [x] Limitations & best practices

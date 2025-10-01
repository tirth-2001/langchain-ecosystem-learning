🔹 Theory: FewShotPromptTemplate

### 1. What it is

- A **prompt template** that automatically includes **examples (few-shots)** into your prompt.
- Instead of hardcoding examples into your string, you define:

  - **Examples dataset** → list of inputs/outputs.
  - **Example prompt** → how each example is formatted.
  - **Prefix & Suffix** → text before/after examples.

- At runtime, LangChain inserts examples + user input into the final prompt.

### 2. Why not just manually paste examples?

- **Scalability** → You can store many examples and programmatically choose which to insert.
- **Consistency** → Formatting is handled by a template.
- **Flexibility** → Examples can come from a DB, API, or file — not hardcoded strings.
- **Dynamic selection** → You can implement **example selectors** (e.g., pick closest examples to the query with embeddings).

### 3. Real-world use cases

- **Text classification** → Show examples of labels.
- **Translation** → Provide example pairs.
- **Style imitation** → Teach the LLM by showing stylistic samples.

---

# 🔹 Code Example: FewShotPromptTemplate (JS/TS)

```ts
import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts'

// Example dataset (could come from a DB or embeddings selector)
const examples = [
  { word: 'happy', antonym: 'sad' },
  { word: 'tall', antonym: 'short' },
]

// How each example should look in the prompt
const examplePrompt = new PromptTemplate({
  inputVariables: ['word', 'antonym'],
  template: 'Word: {word} → Antonym: {antonym}',
})

// FewShotPromptTemplate definition
const fewShotPrompt = new FewShotPromptTemplate({
  examples,
  examplePrompt,
  prefix: 'Give the antonym for each input word.\n\nExamples:',
  suffix: '\n\nWord: {input}\nAntonym:',
  inputVariables: ['input'], // only the user input comes at runtime
})

// Generate the final formatted prompt
const formattedPrompt = await fewShotPrompt.format({ input: 'big' })

console.log(formattedPrompt)

/*
Expected Output:

Give the antonym for each input word.

Examples:
Word: happy → Antonym: sad
Word: tall → Antonym: short

Word: big
Antonym:
*/
```

---

# 🔹 Advanced: Example Selector

Instead of using all examples, you can **dynamically select** a subset:

```ts
import { SemanticSimilarityExampleSelector } from 'langchain/example_selectors'
import { OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'

const examples = [
  { word: 'happy', antonym: 'sad' },
  { word: 'up', antonym: 'down' },
  { word: 'early', antonym: 'late' },
  { word: 'light', antonym: 'dark' },
]

// Store examples in a vector DB
const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
  examples,
  new OpenAIEmbeddings(),
  MemoryVectorStore,
  { k: 2 }, // pick top 2 similar examples
)

const dynamicFewShot = new FewShotPromptTemplate({
  exampleSelector,
  examplePrompt,
  prefix: 'Give the antonym for each input word.\n\nExamples:',
  suffix: '\n\nWord: {input}\nAntonym:',
  inputVariables: ['input'],
})

const dynamicPrompt = await dynamicFewShot.format({ input: 'night' })
console.log(dynamicPrompt)
```

Here, only the **most relevant 2 examples** will be injected automatically.

---

✅ **Key Takeaway**:
FewShotPromptTemplate is powerful when:

- You want **many examples**, but only a subset should appear.
- You want to keep prompts **modular, reusable, and dynamic**.
- You don’t want to manually juggle string concatenation for examples.

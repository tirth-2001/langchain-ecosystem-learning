# 📘 Prompt Serialization in LangChain

### 🔹 What is Prompt Serialization?

Serialization is the process of **defining prompts in external formats** (like JSON or YAML) instead of hardcoding them in your code.
This helps when:

- You want **non-developers** (product, content, domain experts) to modify prompts without touching TypeScript/JS code.
- You need **portability & maintainability** — prompts can live in config files, version-controlled separately.
- You want to **swap or A/B test prompts** easily without redeploying code.

LangChain supports **YAML** and **JSON** formats for prompt serialization.

---

## 🔹 YAML / JSON Prompt Schema

A typical serialized prompt looks like this (YAML format):

```yaml
_type: prompt
input_variables: ['adjective', 'content']
template: 'Tell me a {adjective} story about {content}.'
```

Or JSON:

```json
{
  "_type": "prompt",
  "input_variables": ["adjective", "content"],
  "template": "Tell me a {adjective} story about {content}."
}
```

---

## 🔹 How to Load Serialized Prompts

LangChain provides `loadPrompt` for this.

```ts
import { loadPrompt } from 'langchain/prompts'
import { ChatOpenAI } from '@langchain/openai'

async function runSerializationDemo() {
  // 1. Load from JSON file
  const prompt = await loadPrompt('./stage2-chains/prompt-templates/story-prompt.json')

  // 2. Create LLM
  const llm = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })

  // 3. Format the prompt with variables
  const formatted = await prompt.format({ adjective: 'funny', content: 'a robot learning to cook' })
  console.log('Formatted Prompt:', formatted)

  // 4. Pass to LLM
  const result = await llm.invoke(formatted)
  console.log('LLM Output:', result.content)
}

runSerializationDemo().catch(console.error)
```

---

## 🔹 Advanced Example: Chat Prompt with Multiple Messages

`_type: chat_prompt` lets you define **system/human/AI roles** externally.

```yaml
_type: chat_prompt
input_variables: ['language', 'topic']
messages:
  - role: system
    prompt:
      _type: prompt
      template: 'You are a helpful assistant who always replies in {language}.'
      input_variables: ['language']
  - role: human
    prompt:
      _type: prompt
      template: 'Tell me about {topic}.'
      input_variables: ['topic']
```

Usage:

```ts
const chatPrompt = await loadPrompt('./stage2-chains/prompt-templates/chat-example.yaml')

const formattedChat = await chatPrompt.formatMessages({
  language: 'Spanish',
  topic: 'artificial intelligence',
})

console.log(formattedChat)
// → [ { role: "system", content: "You are a helpful assistant who always replies in Spanish." },
//     { role: "human", content: "Tell me about artificial intelligence." } ]

const result = await llm.invoke(formattedChat)
console.log('LLM Output:', result.content)
```

---

## 🔹 Why is this useful?

- Keeps **prompts modular** → different teams can manage them.
- Easy **A/B testing** → load `chat-example-v1.yaml` vs `chat-example-v2.yaml`.
- Encourages **clean repo structure** → prompts live in `./prompts/` folder.
- Works well with **LangSmith** (later in Stage 8), since prompts are versioned and tracked.

---

✅ **Outcome of this section**
You now know how to:

- Define prompts in **JSON/YAML**
- Load them with `loadPrompt`
- Use them with LLMs & Chat models
- Keep prompts modular, externalized, and maintainable

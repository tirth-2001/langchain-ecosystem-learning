# **3.3.1 Tools Overview & Anatomy**

## 📖 Theory

### 🔹 What is a Tool in LangChain?

- A **Tool** is a wrapper around **a function, API, or service** that an Agent can call.
- Tools allow agents to _act_ on the environment beyond just generating text.

Think of it as:

- **LLM (reasoning)** → decides it needs help
- **Tool (acting)** → executes the action (e.g., call API, run math)
- **LLM (reasoning again)** → interprets tool output, continues

---

### 🔹 Anatomy of a Tool

At its core, a tool has:

1. **Name** → unique identifier used by the agent
2. **Description** → natural language hint to the LLM, explains _when to use it_
3. **Function** → actual logic to execute when called
4. **Input/Output Schema** (optional, but important for structured tools)

---

### 🔹 Types of Tools in LangChain

1. **Built-in Tools** → provided by LangChain

   - Examples: `Calculator`, `SerpAPI`, `RequestsGet`
   - Ready-made for common tasks

2. **Custom Tools** → user-defined logic

   - Wraps _your_ APIs, SDKs, or helper functions
   - Defined using `new Tool({...})` or `DynamicTool`

---

### 🔹 Tools & Agents

- Agents **do not hardcode logic** → they decide dynamically when to use a tool.
- The **description** is key: LLM uses it to figure out relevance.
- Example: If you give an LLM two tools (`Calculator` and `WeatherAPI`), the LLM will learn:

  - If the user asks “What is 5×7?”, → use Calculator
  - If the user asks “What’s the weather in Paris?”, → use WeatherAPI

---

## 💻 TypeScript Example

Let’s build a simple **Custom Tool** that converts temperatures between Celsius and Fahrenheit.

```ts
import { Tool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { initializeAgentExecutorWithOptions } from 'langchain/agents'

// 1. Define a custom temperature conversion tool
const temperatureTool = new Tool({
  name: 'temperature_converter',
  description:
    "Converts temperature between Celsius and Fahrenheit. Input must be in the format 'toF: <number>' or 'toC: <number>'.",
  func: async (input: string) => {
    try {
      if (input.startsWith('toF:')) {
        const value = parseFloat(input.split(':')[1].trim())
        return `${value}°C = ${(value * 9) / 5 + 32}°F`
      } else if (input.startsWith('toC:')) {
        const value = parseFloat(input.split(':')[1].trim())
        return `${value}°F = ${((value - 32) * 5) / 9}°C`
      } else {
        return "Invalid format. Use 'toF: <number>' or 'toC: <number>'."
      }
    } catch (e) {
      return 'Error: Could not parse input.'
    }
  },
})

// 2. Setup the LLM
const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
})

// 3. Create an executor with the tool
const runAgent = async () => {
  const executor = await initializeAgentExecutorWithOptions([temperatureTool], model, {
    agentType: 'zero-shot-react-description', // ReAct agent type
    verbose: true,
  })

  console.log('Agent ready! Ask it something...')

  const result1 = await executor.run('Convert 25 Celsius to Fahrenheit')
  console.log('Result1:', result1)

  const result2 = await executor.run('What is 77 Fahrenheit in Celsius?')
  console.log('Result2:', result2)
}

runAgent()
```

---

### 🔎 How this works

1. We define a **custom tool** (`temperature_converter`) with:

   - `name` → identifier for the agent
   - `description` → how/when LLM should use it
   - `func` → logic to run

2. We initialize an agent with `initializeAgentExecutorWithOptions`, passing:

   - The tool(s)
   - The LLM model

3. The agent will now:

   - Parse queries
   - Decide when to use the tool
   - Call the tool with correct input
   - Return the interpreted answer

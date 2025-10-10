# Prebuilt Tools in Langchain

## **Step 1 – Theory: Prebuilt Tools in LangChain**

LangChain comes with a set of **prebuilt tools** that save you from writing boilerplate code for common tasks like web search, math evaluation, code execution, file handling, etc.

🔑 **Why use prebuilt tools?**

- Standardized API → all tools expose the same `Tool` or `StructuredTool` interface.
- Saves development time for common utilities.
- Integrates seamlessly with agents (ReAct, OpenAI Functions Agent, etc.).

📦 **Categories of prebuilt tools**:

1. **Math & Reasoning**

   - `Calculator` → for symbolic/numeric computations.
   - `SerpAPI` / `TavilySearchResults` + `Calculator` → chain of "search + math reasoning".

2. **Web & Search**

   - `SerpAPI`, `TavilySearchResults`, `DuckDuckGoSearchRun` → for fetching info from the internet.
   - These wrap external APIs, providing structured results.

3. **Code Execution**

   - `PythonREPLTool` → execute Python code (good for data analysis, math, simulations).
   - `RequestsGetTool`, `RequestsPostTool` → for web requests.

4. **File & Document Tools**

   - `ReadFileTool`, `WriteFileTool` → for filesystem operations.
   - `CSVAgent` → query CSVs using LLM + Pandas.

5. **Other Utilities**

   - Date/time tools, JSON manipulation, SQL database tools (`SQLDatabaseToolkit`).

💡 **Agent Integration**
Prebuilt tools are most useful when plugged into an **Agent** that dynamically chooses when/how to call them, e.g.:

```plaintext
User: "What is the square root of the average population of France and Germany?"
Agent:
  1. Uses `TavilySearch` to fetch population.
  2. Uses `Calculator` to compute.
  3. Returns the answer.
```

---

## **Step 2 – Isolated Examples (Per Tool)**

### Example 1 – Math (Calculator)

```ts
import { Calculator } from 'langchain/tools/calculator'

const calculator = new Calculator()

const result = await calculator.invoke('sqrt(16) + log(100)')
console.log('Calculator Result:', result)
// Output: "Calculator Result: 6"
```

---

### Example 2 – Web Search (Tavily)

```ts
import { TavilySearchResults } from '@langchain/community/tools/tavily_search'

const search = new TavilySearchResults({ apiKey: process.env.TAVILY_API_KEY })

const result = await search.invoke('Current Prime Minister of the UK')
console.log('Search Result:', result)
/*
Output:
[
  { title: "Rishi Sunak - Wikipedia", url: "...", content: "Rishi Sunak is the current Prime Minister..." },
  ...
]
*/
```

---

### Example 3 – Python Execution

```ts
import { PythonREPLTool } from '@langchain/community/tools/python'

const pyTool = new PythonREPLTool()

const result = await pyTool.invoke('import math\nmath.factorial(6)')
console.log('Python Result:', result)
// Output: "720"
```

---

### Example 4 – File Read/Write

```ts
import { ReadFileTool, WriteFileTool } from '@langchain/community/tools/file_system'

const writer = new WriteFileTool()
await writer.invoke({ file_path: 'example.txt', text: 'LangChain is awesome!' })

const reader = new ReadFileTool()
const result = await reader.invoke('example.txt')

console.log('File content:', result)
// Output: "LangChain is awesome!"
```

---

## **Step 3 – Combined Mini-Project**

🎯 **Scenario:**
A user asks: _“What is the population of India and the USA combined, and then save the answer in a file?”_

👉 Agent needs to:

1. Use **TavilySearch** to fetch populations.
2. Use **Calculator** to compute the sum.
3. Use **WriteFileTool** to save results.

```ts
import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
import { Calculator } from 'langchain/tools/calculator'
import { WriteFileTool } from '@langchain/community/tools/file_system'
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'

const llm = new ChatOpenAI({ model: 'gpt-4o-mini' })

const tools = [new TavilySearchResults({ apiKey: process.env.TAVILY_API_KEY }), new Calculator(), new WriteFileTool()]

// Agent prompt
const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful AI that can search, calculate, and write to files.'],
  ['human', '{input}'],
])

// Create agent
const agent = await createToolCallingAgent({ llm, tools, prompt })

// Wrap with executor
const executor = new AgentExecutor({ agent, tools })

const response = await executor.invoke({
  input: 'Find population of India and USA, add them, and save result in population.txt',
})

console.log('Final Response:', response.output)
```

✅ **What happens under the hood:**

- Agent first calls **TavilySearch** twice (India, USA).
- Then passes numeric values to **Calculator**.
- Finally, calls **WriteFileTool** to save results.
- Returns confirmation to user.

---

👉 So this way we cover:

1. **Theory** → Overview of prebuilt tools.
2. **Examples** → Math, Search, Python, File system.
3. **Mini Project** → Combined orchestration with Agent.

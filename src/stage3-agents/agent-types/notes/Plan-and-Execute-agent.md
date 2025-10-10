## 🔹 Plan-and-Execute Agent – Theory

- **ReAct agent** mixes reasoning and acting step by step.
- For complex, multi-step queries, ReAct can become noisy or inefficient.
- **Plan-and-Execute** separates concerns:

  1. **Planner** → creates a structured plan (a concise sequence of steps)
  2. **Executor** → executes each step in order using tools

This is more **interpretable** and **scalable** for complex workflows, especially when tasks need **sequential orchestration** across tools.

🔑 **When to use**:

- Multi-step queries like “Research X, summarize it, then translate to French.”
- Tasks where explicit planning helps prevent loops or confusion.

---

## 🔹 Demo Plan (updated to match current code)

We implement a **Plan-and-Execute Assistant** with:

- **Tools**: `Search`, `Summarizer`, `Translator`
- **Single LLM**: used for both planning and execution (you can split if desired)

---

```ts
/**
 * plan-and-execute-agent.ts
 * LangChain v0.3.x — correct Plan-and-Execute usage
 *
 * Executor:
 *   PlanAndExecuteAgentExecutor.fromLLMAndTools({ llm, tools, ... })
 */

import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { DynamicTool } from 'langchain/tools'
import { PlanAndExecuteAgentExecutor } from 'langchain/experimental/plan_and_execute'

// -----------------------
// Tools (demo/stub implementations)
// -----------------------
const searchTool = new DynamicTool({
  name: 'Search',
  description: 'Return a short factual result for a query (demo stub).',
  func: async (input: string) => {
    if (input.toLowerCase().includes('langchain')) {
      return 'LangChain is a framework for building applications with LLMs.'
    }
    return `Simulated search result for "${input}"`
  },
})

const summarizerTool = new DynamicTool({
  name: 'Summarizer',
  description: 'Summarize the given text into 1-2 sentences.',
  func: async (input: string) => {
    return `Summary: ${input.slice(0, 120)}${input.length > 120 ? '...' : ''}`
  },
})

const translatorTool = new DynamicTool({
  name: 'Translator',
  description: 'Translate English text into French (demo stub).',
  func: async (input: string) => {
    return `Traduction (fr): ${input}`
  },
})

// -----------------------
// LLM (same for planner and executor in this demo)
// -----------------------
const llm = new ChatOpenAI({
  modelName: 'gpt-4.1-mini',
  temperature: 0,
})

// -----------------------
// Build the Plan-and-Execute executor via factory
// -----------------------
async function main() {
  const tools = [searchTool, summarizerTool, translatorTool]

  const executor = await PlanAndExecuteAgentExecutor.fromLLMAndTools({
    llm,
    tools,
    verbose: true,
    // humanMessageTemplate: 'Custom template: {input}' // optional
  })

  // Run a complex task that benefits from planning
  const query = 'Find what REITs are, summarize it, and then translate the summary into French.'

  console.log('Running Plan-and-Execute query:\n', query)
  const result = await executor.invoke({ input: query })

  console.log('\n=== Final executor output ===')
  console.log(result.output ?? result)
}

main().catch(console.error)
```

---

✅ What you’ll see:

- **Planner** proposes a short ordered plan, e.g.,
  - Step 1: Search topic
  - Step 2: Summarize
  - Step 3: Translate
- **Executor** then calls the corresponding tools in order until completion.

---

## 🔹 Notes and Tips

- You can pass a custom `humanMessageTemplate` to influence how the planner receives the input, via `fromLLMAndTools({ humanMessageTemplate })`.
- The same `ChatOpenAI` instance can power both planning and execution; for more control, provide different models or temperatures.
- Replace the demo `DynamicTool` stubs with your real tools (web search, DB queries, RAG, etc.).

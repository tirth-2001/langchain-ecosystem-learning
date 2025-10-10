# ReAct Agents (Theory + Practical)

## 1) What is ReAct (quick)

- **ReAct** = **RE**asoning + **AC**tion — the agent alternates between _thinking_ (reasoning steps) and _doing_ (calling tools).
- Typical loop: the agent **thinks** in natural language, when it decides a tool is needed it emits an **action** (tool name + tool input), receives an **observation** (tool result), then continues reasoning — possibly calling more tools — until it produces a final answer.
- Strength: natural and flexible for multi-step problems.
- Weakness: LLM-generated intermediate reasoning is free-form and can break parsers or automated tooling unless you _constrain format_.

---

## 2) When to pick ReAct

- Good for: multi-step problems where you want the agent to _explain its thought process_ and combine several tools (e.g., search → calculate → synthesize).
- Avoid when: you need a stable, machine-readable tool-call interface (use tool-calling agents instead) or if you cannot control LLM outputs.

---

## 3) Practical concerns in LangChain v0.3.x

- ReAct can be brittle because it expects a strict intermediate format (Action/Action Input/Observation markers). If your LLM deviates, LangChain's parser fails.
- Mitigations:

  - Lower temperature (0 - 0.2) to reduce creative deviations.
  - Supply a **very explicit system prompt** that describes EXACT output format for actions.
  - Use `verbose: true` to inspect the agent scratchpad (intermediate steps).
  - Prefer **tool-calling agents** in production if you only need tool invocation (they’re more robust).

- In v0.3.x the pattern is: `DynamicTool` for tools, `createReactAgent(...)` to create agent, then `new AgentExecutor({ agent, tools, verbose })` to run, using `.invoke()`.

---

## 4) ReAct example (structured and robust)

> **Goal:** Demonstrate a ReAct agent that can (a) use a calculator tool and (b) query a simple "search" tool. The prompt forces the agent to use an exact action format to reduce parsing errors.

```ts
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
import { DynamicTool } from 'langchain/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'

// ----- Tools -----
// Calculator: eval-based demo (safe-only-for-local-demo; sanitize/implement properly in prod)
const calculatorTool = new DynamicTool({
  name: 'Calculator',
  description: 'Useful for arithmetic calculations. Input should be a math expression.',
  func: async (input: string) => {
    try {
      // safe eval is required in production — this is just a demo
      // you may want to use a math library instead of eval
      // ensure input contains only numbers/operators
      return eval(input).toString()
    } catch (err) {
      return `Error in calculation: ${String(err)}`
    }
  },
})

// Simple search stub (returns canned answers or call a real API)
const searchTool = new DynamicTool({
  name: 'Search',
  description: 'Search for factual information given a short query. Returns short factual text.',
  func: async (input: string) => {
    // Replace with real API or vector retrieval in real app
    if (input.toLowerCase().includes('langchain')) {
      return 'LangChain is a framework for building applications with LLMs.'
    }
    return `Simulated search result for "${input}"`
  },
})

// ----- LLM -----
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0, // low temperature to keep format stable
})

// ----- Explicit ReAct Prompt (IMPORTANT) -----
// This prompt forces the intermediate-action format. The agent *must* only use the following action format:
// Action: <TOOL_NAME>
// Action Input: <input>
// After observing, the tool result will be appended as Observation: <result>
// When done, produce "Final Answer: <answer>"
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an agent that follows the ReAct pattern. When you decide to use a tool, you MUST emit EXACTLY:
Action: <TOOL_NAME>
Action Input: <input>

After the tool returns, you will see an Observation and you can continue reasoning.
When finished, produce a single line starting with "Final Answer:" followed by the answer.
Do not include any extra commentary outside the Action / Observation markers.`,
  ],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
])

// ----- Create agent + executor -----
async function runReActDemo() {
  const agent = await createReactAgent({ llm, tools: [calculatorTool, searchTool], prompt })
  const executor = new AgentExecutor({ agent, tools: [calculatorTool, searchTool], verbose: true })

  // Example queries:
  const queries = ['What is 25 * 4 + 10?', 'Tell me briefly: what is LangChain?']

  for (const q of queries) {
    console.log('\n=== QUERY ===\n', q)
    const res = await executor.invoke({ input: q })
    console.log('=== RESULT OUTPUT ===\n', res.output)
  }
}

runReActDemo().catch(console.error)
```

**Notes on the example**

- The prompt forces the action markers. That reduces parsing errors but **doesn’t eliminate them** (LLMs still sometimes stray).
- `verbose: true` prints the agent scratchpad — use this to debug exactly what the agent thought and what action it produced.
- Use `temperature: 0` or very low to keep outputs deterministic.

---

## 5) Debugging checklist (if you see parse errors)

1. Set `temperature=0`.
2. Inspect `executor` verbose output — the scratchpad shows exactly the agent's intermediate lines.
3. Verify the system prompt explicitly mandates the action markers and final answer format.
4. Test the tools independently (call `calculatorTool.func("2+2")`) to ensure tools return expected values.
5. If the agent still emits non-conforming outputs, switch to **tool-calling agents** (`createToolCallingAgent`) for critical workflows (the pattern you moved to). Tool-calling agents enforce tool call APIs and are more robust for production.

---

## 6) When to avoid ReAct (recommendation)

- If you need strict machine-readable tool invocation (use tool-calling agent).
- If you can’t guarantee low temperature or strict prompt control.
- If tools return complex structured outputs that require reliable parsing.

---

## 7) Mini-project idea (inline)

- **ReAct Multi-Tool Assistant**: Build a small agent wired with:

  - `Calculator` (math),
  - `Search` (facts),
  - `TodoTool` (add a todo item to in-memory store).
    Demonstrate 3 queries: a math question, a fact lookup, and a composite multi-step query (search → compute → answer).

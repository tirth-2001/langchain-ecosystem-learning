# Stage 3.1 – Agents Foundations

## 🔹 Theory: What are Agents in LangChain

| Concept              | Description                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent**            | An Agent is a system that can **reason, decide, and act**. It extends chains by dynamically choosing tools or actions based on input. |
| **Agent Loop**       | Core idea: **Observe → Decide → Act → Observe**. Agents can iterate multiple times before returning a final output.                   |
| **When to Use**      | Use agents when a task involves **decision-making**, **tool usage**, or **multi-step reasoning**.                                     |
| **Chains vs Agents** | Chains: Fixed sequence of steps. <br> Agents: Dynamic behavior with reasoning + tool selection.                                       |
| **Tools**            | Agents can invoke external utilities (calculator, search, APIs). Tools are wrapped in LangChain Tool objects.                         |
| **Executor**         | Agents run through an **executor**, which handles the agent loop, memory, logging, and termination conditions.                        |
| **Observability**    | You can track agent reasoning, tool usage, and intermediate steps via **verbose logging** or **LangSmith tracing**.                   |

---

## 🔹 Mini-project: Calculator Agent

**Objective:** Build an agent that dynamically decides when to use a calculator to solve arithmetic queries.

**Key Steps:**

1. **Define Tools** – Wrap a basic calculator function in a Tool object.
2. **Create Agent** – Use a ReAct agent type for dynamic reasoning.
3. **Run Agent** – Provide natural language input like `"What is 25 * 4 + 10?"` and get the computed answer.

**Code Skeleton (`calculator-agent.ts`):**

```ts
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { initializeAgentExecutorWithOptions } from 'langchain/agents'
import { Tool } from 'langchain/tools'

// 1️⃣ Define the Calculator Tool
const calculatorTool = new Tool({
  name: 'Calculator',
  description: 'Useful for arithmetic calculations',
  func: async (input: string) => {
    try {
      // simple eval-based calculation for demo
      return eval(input).toString()
    } catch (err) {
      return 'Error in calculation'
    }
  },
})

// 2️⃣ Initialize LLM
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
  openAIApiKey: process.env.OPENAI_API_KEY,
})

// 3️⃣ Initialize Agent Executor
const executor = await initializeAgentExecutorWithOptions([calculatorTool], llm, {
  agentType: 'zero-shot-react-description', // ReAct agent
  verbose: true,
})

// 4️⃣ Run Demo
const inputQuery = 'Calculate 25 * 4 + 10'
console.log('Input:', inputQuery)
const result = await executor.call({ input: inputQuery })
console.log('Output:', result.output)
```

**Outcome:**

| Input               | Agent Action         | Output  |
| ------------------- | -------------------- | ------- |
| `"25 * 4 + 10"`     | Uses Calculator Tool | `"110"` |
| `"What is 50 / 5?"` | Uses Calculator Tool | `"10"`  |

**Notes:**

- This demonstrates the **Agent Loop**: the agent reasons about whether it needs a tool.
- `verbose: true` shows intermediate steps and reasoning.

# 📌 Stage 3 – LangChain Agents

**Objective:** Understand how to build **reasoning + acting pipelines** using LangChain Agents, explore **agent types**, leverage **tools**, and integrate agents into real workflows.

Stage 3 can be split into the following subsections:

---

## **3.1 Agents – Foundations & Core Concepts**

**Theory Topics:**

- What is an Agent in LangChain?
- Agent loop: **Reasoning + Acting**
- Difference between **Chains vs Agents**
- When to use an Agent vs a Chain
- Agent Executors: `initializeAgentExecutorWithOptions`
- How agents interact with **tools**

**Micro-project / Demo Idea:**

- **Simple Calculator Agent** → An agent that decides when to use a calculator tool for math queries.

---

## **3.2 Core Agent Types**

| Agent Type                 | Description                                                        | Example / Demo                |
| -------------------------- | ------------------------------------------------------------------ | ----------------------------- |
| **ReAct Agent**            | Reasoning + Action pattern; decides dynamically when to call tools | Demo: `react-agent.ts`        |
| **Plan-and-Execute Agent** | Separates planning from execution; good for multi-step workflows   | Demo: `plan-execute-agent.ts` |
| **Structured Agent**       | Schema-driven, function-calling agent                              | Demo: `structured-agent.ts`   |

**Micro-projects / Hands-on:**

1. **Search Agent** → Decides when to fetch info from an API vs answer directly
2. **Hybrid Q&A Agent** → Chooses between generating answer or using a tool

---

## **3.3 Tools & Custom Integrations for Agents**

**Theory Topics:**

- Built-in tools: Calculator, SerpAPI, etc.
- Creating **custom tools** using `Tool` class
- Wrapping external services (GitHub, Weather, News APIs)
- How agents select tools dynamically

**Micro-project / Demo Idea:**

- **GitHub Assistant Agent** → Combines ReAct agent + GitHub API + calculator tool for real-time repo stats and calculations

---

## **3.4 Agent Executors & Advanced Configuration**

**Theory Topics:**

- Executor options: max iterations, return intermediate steps, verbose logging
- Streaming responses from agents
- Error handling & fallback strategies
- Memory integration with agents (linking Stage 2 memory modules)

**Micro-project / Demo Idea:**

- **Verbose Debugging Agent** → Runs agent with verbose mode and logs reasoning steps

---

## **3.5 Micro-Projects / Capstone for Stage 3**

| Project                   | Focus                                             |
| ------------------------- | ------------------------------------------------- |
| Calculator Agent          | Agent + calculator tool + decision-making         |
| Search Agent              | Dynamic tool selection for API fetching           |
| Hybrid Q&A Agent          | Combines generation + tool usage decisions        |
| GitHub Assistant Agent    | ReAct agent + custom tools + multi-step reasoning |
| Plan-and-Execute Workflow | Multi-step tasks orchestrated with agent planning |

---

## **Suggested Timeline for Stage 3**

| Week   | Topics                                                     |
| ------ | ---------------------------------------------------------- |
| Week 1 | 3.1 Agents Foundations + Calculator Agent                  |
| Week 2 | 3.2 Core Agent Types (ReAct, Plan-and-Execute, Structured) |
| Week 3 | 3.3 Tools & Custom Integrations for Agents                 |
| Week 4 | 3.4 Agent Executors & Advanced Configuration               |
| Week 5 | 3.5 Micro-Projects / Stage 3 Capstone Agent                |

---

✅ **Stage 3 Outcomes**

- Deep understanding of **Agents in LangChain**
- Ability to **build multi-step reasoning agents**
- Integrate **tools dynamically** into agent workflows
- Combine **memory + chains + tools** for real-life agent applications

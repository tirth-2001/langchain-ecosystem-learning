## **Stage 3.3: Tools & Custom Integrations for Agents**

### **3.3.1 – Tools Overview & Anatomy**

- **Theory**:

  - What a Tool is in LangChain.
  - Role of Tools in Agents (bridge between reasoning & action).
  - Anatomy of a Tool (`name`, `description`, `func`).
  - How LangChain standardizes tool interfaces.

- **Practical**:

  - Define a simple custom tool in TypeScript (e.g., a calculator).
  - Integrate it into an agent.

---

### **3.3.2 – Built-in Tools**

- **Theory**:

  - Commonly used built-in tools:

    - `SerpAPI`, `Requests`, `LLM-math`, `PythonREPL`, etc.

  - When to use built-in vs custom.

- **Practical**:

  - Use a built-in tool (like `RequestsGet`) in an agent.
  - Mini example: agent fetching live data (e.g., a stock price or weather).

---

### **3.3.3 – Creating Custom Tools**

- **Theory**:

  - Deep dive into building tools tailored for business logic.
  - Input/Output schema design.
  - Error handling in tools.

- **Practical**:

  - Build a `DictionaryTool` (lookup words & definitions via API).
  - Show how to register and test it with an agent.
  - Mini project: integrate with a free API (e.g., OpenWeather or Dictionary API).

---

### **3.3.4 – Multi-Tool Agents**

- **Theory**:

  - How agents handle multiple tools.
  - Tool selection strategies (ReAct, Plan & Execute).
  - How tool descriptions affect agent decisions.

- **Practical**:

  - Agent with 2 tools (Calculator + Weather API).
  - Observe reasoning & tool selection in logs.

---

### **3.3.5 – Advanced Integrations**

- **Theory**:

  - Wrapping external services as tools (Databases, APIs, internal systems).
  - Sync vs Async considerations in JS/TS.
  - Handling API rate limits, retries, caching.

- **Practical**:

  - Build a `GithubRepoTool` to fetch repo details via GitHub API.
  - Show structured output and error handling.

---

### **3.3.6 – Mini Project: Agent with Domain-Specific Tools**

- **Objective**: Build a **Research Assistant Agent**.
- **Tools**:

  - Web search tool.
  - Wikipedia API tool.
  - Math tool.

- **Flow**: User asks complex question → agent decides → calls right tools → synthesizes final answer.
- **Deliverable**: TS code + logs of agent reasoning.

---

### **3.3.7 – Recap & Notes**

- Summarize key concepts:

  - Tool anatomy.
  - Built-in vs custom.
  - Multi-tool orchestration.
  - Best practices for robust custom integrations.

- Short notes for revision.

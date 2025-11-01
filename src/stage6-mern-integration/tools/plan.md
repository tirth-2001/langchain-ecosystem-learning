# 🧩 Stage 6.3 – Tool & Memory Management (Balanced Depth)

## 🎯 Goal

Enhance the backend with modular tools (extra capabilities for the LLM) and memory (context continuity), but keep implementation pragmatic and reusable.

---

| Sub-section                            | Focus Area                                                                                                      | Deliverable                             | Depth Level |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------- |
| **6.3.1 – Tool Framework Setup**       | Introduce a clean abstraction for tools (e.g., calculator, weather, summarizer).                                | `tools/` folder + base `ToolInterface`. | 🟢 Medium   |
| **6.3.2 – Integrate Tools with Agent** | Extend `createSimpleChatChain()` → `createAgentChain()` using LangChain’s `initializeAgentExecutorWithOptions`. | Working agent that can call tools.      | 🟢 Medium   |
| **6.3.3 – Add Simple Memory**          | Use `BufferMemory` or `ConversationSummaryMemory` for short-term recall.                                        | Re-use for `/api/ask` endpoint.         | 🟡 Light    |
| **6.3.4 – Modular Config Loader**      | Optional config-based registration (add/remove tools dynamically).                                              | `config/tools.config.ts`.               | 🟡 Light    |

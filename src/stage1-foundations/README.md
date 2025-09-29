# Stage 1 – Foundations & Core Building Blocks

## 🎯 Learning Objectives

- Understand why **LangChain exists** (abstraction & orchestration layer over raw LLM APIs).
- Get familiar with LangChain’s **core building blocks**:
  - `LLM` – large language models.
  - `PromptTemplate` – parameterized prompts.
  - `Chain` – combining LLMs + prompts into workflows.
  - `Agent` – decision-making loop.
  - `Tool` – external functions/APIs the LLM can use.
  - `Memory` – ways to persist conversational state.
- Explore the **LangChain ecosystem**:
  - **LangChain** (framework).
  - **LangGraph** (workflow orchestration).
  - **LangSmith** (debugging, monitoring).
- Compare **Raw OpenAI API vs LangChain abstraction**.
- Track **token usage & execution latency**.

---

## 🧩 Core Concepts Covered

### 1. LLMs

- Large Language Models (LLMs) are prediction machines trained on vast text.
- LangChain provides wrappers for many providers (OpenAI, Anthropic, HuggingFace).
- You can swap models without rewriting pipeline logic.

### 2. PromptTemplate

- Allows variable substitution in prompts.
- Encourages reusable, parameterized prompts.
- Helps structure inputs cleanly instead of messy string concatenation.

### 3. Chains

- Chains connect inputs → prompt → LLM → output.
- `LLMChain` = simplest form (prompt + LLM).
- More advanced chains in later stages (Sequential, Router, etc.).

### 4. Ecosystem Preview

- **LangChain Core** – building blocks.
- **LangGraph** – flow-based orchestration for multi-step tasks.
- **LangSmith** – observability (trace steps, costs, tokens).

---

## 🛠️ Micro-Project: Hello LangChain

1. **Raw OpenAI API Call**
   - Direct API call using `openai` package.
   - Logs response, tokens, and latency.
2. **LangChain Equivalent**
   - Uses `ChatOpenAI` + `PromptTemplate` + `LLMChain`.
   - Adds `CallbackManager` to capture tokens.
   - Compare with raw API: slightly higher tokens/latency, but better structure and observability.

---

## 📊 Insights from Results

- **Latency**: Raw API is faster; LangChain adds overhead for orchestration, logging, and structure.
- **Tokens**: LangChain often uses slightly more tokens (adds system messages, template formatting).
- **Trade-off**:
  - Raw API → fastest, minimal abstraction.
  - LangChain → slightly slower but powerful for pipelines, agents, memory, tools.

---

## ✅ Learning Outcomes

By the end of Stage 1 you can:

- Call OpenAI directly and via LangChain.
- Use `PromptTemplate` and `LLMChain`.
- Log tokens and latency with LangChain’s callback system.
- Understand the **why** behind LangChain abstractions.

---

## 📚 References

- [LangChain JS Docs](https://js.langchain.com/docs/)
- [LangChain Core: LLMs](https://js.langchain.com/docs/modules/model_io/llms)
- [OpenAI Chat Models](https://js.langchain.com/docs/integrations/chat/openai)

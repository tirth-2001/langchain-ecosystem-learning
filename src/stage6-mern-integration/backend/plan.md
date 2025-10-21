# **Stage 6.1 – Backend Integration (LangChain + Node/Express)**

### 🎯 **Goal**

Set up a production-ready backend that:

- Exposes REST / GraphQL / WebSocket endpoints for LangChain operations
- Manages environment variables & secrets securely
- Supports task creation, LLM calls, RAG queries, and agent tool invocations
- Can later plug into MongoDB (for persistence) and React frontend (for UI)

---

## **📦 6.1 – Subdivision**

### **6.1.1 – Project Scaffold & Environment Setup**

**Focus:** Create the Node + Express project skeleton and install dependencies.

**Key Steps**

- `npm init -y`, `tsconfig.json`, ESLint, Prettier
- Install: `express`, `dotenv`, `langchain`, `openai`, `cors`, `body-parser`, `nodemon`
- Define folder structure:

  ```
  /server
   ├── src/
   │   ├── app.ts
   │   ├── routes/
   │   ├── controllers/
   │   ├── services/
   │   ├── langchain/
   │   │   ├── chains/
   │   │   ├── tools/
   │   │   ├── agents/
   │   │   └── utils/
   │   ├── config/
   │   └── types/
   ├── .env
   └── package.json
  ```

**Deliverable:** ✅ `app.ts` running at `/api/health`

---

### **6.1.2 – LangChain Model Initialization**

**Focus:** Initialize and export model instances for reuse.

**Key Steps**

- Configure OpenAI / Anthropic / Ollama LLMs via environment variables
- Centralize in `langchain/config/modelProvider.ts`
- Support dynamic model switching (for different routes)
- Example: `getModel("gpt-4o-mini")`

**Deliverable:** ✅ Reusable LLM config layer

---

### **6.1.3 – Basic Chains & Endpoints**

**Focus:** Create first backend routes that call LangChain chains.

**Key Steps**

- Build `simpleChatChain.ts` (LLM + PromptTemplate + Memory optional)
- Add Express route `/api/ask`
- Handle request → LangChain → response
- Add streaming support using Server-Sent Events (SSE)

**Deliverable:** ✅ Working `/api/ask` endpoint for user queries

---

### **6.1.4 – Task Controller & LangChain Integration**

**Focus:** Introduce “tasks” as core backend concept (aligning with TaskHub AI idea).

**Key Steps**

- Define a `Task` schema (in-memory first, later MongoDB)

  ```ts
  {
    id, title, description, status, result, createdAt
  }
  ```

- Route `/api/tasks` → create | run | list | delete
- Integrate chain/tool/agent execution under “run task”

**Deliverable:** ✅ Basic Task CRUD + LangChain execution hook

---

### **6.1.5 – Middleware & Error Handling**

**Focus:** Production readiness: secure, reliable, extensible backend.

**Key Steps**

- Add middleware for:

  - Auth stub (token verification ready)
  - Logging (Morgan)
  - Error handling + response formatter

- Add rate-limit + CORS config
- Use async error wrapper

**Deliverable:** ✅ Stable Express backend ready for LangChain extension

---

### **6.1.6 – Integration Test & Verification**

**Focus:** Validate backend endpoints and LangChain calls.

**Key Steps**

- Postman / cURL tests for:

  - `/api/health`
  - `/api/ask`
  - `/api/tasks`

- Verify chain invocation
- Mock LLM output if rate-limited

**Deliverable:** ✅ Backend tested and documented

---

## **🧩 Outcomes**

After 6.1 you’ll have:

- A **LangChain-enabled backend** (Node/Express/TypeScript)
- Modular folder structure for chains, tools, and agents
- Task-based orchestration layer (foundation for 6.2 Frontend + 6.3 Persistence)
- Mock-ready backend even without API keys

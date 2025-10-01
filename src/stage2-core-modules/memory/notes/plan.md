# 📌 Stage 2.3 – Memory (LangChain)

## 🔹 1. **Foundations**

- What memory is in LangChain (difference from RAG & database persistence).
- When/why to use memory vs. stateless chains.

---

## 🔹 2. **Core Memory Types**

1. **ConversationBufferMemory**

   - Keeps all messages in memory.
   - Good for small sessions.

2. **ConversationBufferWindowMemory**

   - Keeps only the last _k_ interactions.
   - Useful for context-limited conversations.

3. **ConversationTokenBufferMemory**

   - Stores conversation until a token limit is reached.
   - Ideal when dealing with strict LLM token budgets.

4. **ConversationSummaryMemory**

   - Summarizes older messages instead of keeping them verbatim.
   - More scalable for long conversations.

---

## 🔹 3. **Advanced Memory**

- **Combined Memory** → mixing multiple memory types.
- **EntityMemory** → tracks facts about people, places, things across sessions.
- **VectorStore-backed Memory** → retrieval-based memory (bridge to RAG, Stage 5).

---

## 🔹 4. **Persistence**

- Saving & loading memory across sessions.
- Using a database (Redis, Mongo, Postgres) or simple JSON file to persist chat history.

---

## 🔹 5. **Micro-projects**

1. **Basic Chatbot with ConversationBufferMemory**
   → Shows how context is maintained vs. stateless.

2. **Sliding Window Chatbot**
   → Demonstrates windowing to manage context size.

3. **Summarizing Chatbot**
   → Handles long conversations by summarizing.

4. **Entity Tracker Bot**
   → Remembers facts about a user (e.g., name, preferences).

5. **Persisted Memory Bot**
   → Stores chat history in JSON/Redis and reloads on restart.

---

👉 By the end of this section, you’ll know **all practical memory types**, when to use which, and how to persist them — giving you a strong foundation before Stage 5 (Memory + RAG deep dive).

---

### 🔒 Midway checklist for **Stage 2.3 – Memory (LangChain)**

1. ✅ **ConversationBufferMemory**
2. ✅ **ConversationBufferWindowMemory**
3. ✅ **ConversationTokenBufferMemory**
4. ✅ **ConversationSummaryMemory**
5. ✅ **Inspecting memory with `loadMemoryVariables()`**
6. ⏳ **CombinedMemory**
7. ⏳ **EntityMemory**
8. ⏳ **VectorStore-backed Memory** (_intro + demo here, deeper dive in Stage 5_)
9. ⏳ **Custom Memory**
10. ⏳ **Saving & Loading Memory**

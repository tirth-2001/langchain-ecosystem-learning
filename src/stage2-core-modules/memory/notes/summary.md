# 📌 Stage 2.3 – Memory (LangChain) – Summary

## 1. Foundations

| Concept             | Details                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Memory in LangChain | Stores conversation state across multiple interactions with an LLM. Enables context-aware responses.                  |
| Difference from RAG | Memory is usually session-oriented and small-scale; RAG uses external vector stores for retrieval from large corpora. |
| Stateless Chains    | Do not store history; each LLM call is independent. Use memory when continuity/context is needed.                     |
| When to use         | Conversational assistants, agents requiring context, chatbots with user personalization, multi-turn reasoning.        |

---

## 2. Core Memory Types

| Memory Type                        | Purpose                        | Key Features                                   | Use Case Example                            |
| ---------------------------------- | ------------------------------ | ---------------------------------------------- | ------------------------------------------- |
| **ConversationBufferMemory**       | Stores all messages            | Keeps full conversation in memory              | Simple chatbot, short sessions              |
| **ConversationBufferWindowMemory** | Keeps only last k interactions | Sliding window approach                        | Context-limited chats, LLM token management |
| **ConversationTokenBufferMemory**  | Token-based memory limit       | Keeps conversation until token budget reached  | LLMs with strict token limits               |
| **ConversationSummaryMemory**      | Summarizes older messages      | Replaces older messages with concise summaries | Scalable long conversations                 |

---

## 3. Advanced Memory

| Advanced Type                 | Purpose                                  | Key Features                          | Notes                                                |
| ----------------------------- | ---------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| **CombinedMemory**            | Mix multiple memory types                | E.g., summary + buffer memory         | Flexible multi-layered memory strategy               |
| **EntityMemory**              | Tracks entities (people, places, things) | Extracts and recalls facts per entity | Useful for personalized chatbots or agent assistants |
| **VectorStore-backed Memory** | Memory via external vector DB            | Retrieval-based, embeddings-powered   | Bridges to RAG (covered in Stage 5)                  |

---

## 4. Persistence Strategies

| Storage Type  | Description        | LangChain Support / Package | Notes                                    |
| ------------- | ------------------ | --------------------------- | ---------------------------------------- |
| **Redis**     | In-memory database | `@langchain/redis`          | Session-based memory; fast & scalable    |
| **MongoDB**   | Document-based DB  | `@langchain/mongodb`        | Good for persistent history storage      |
| **Postgres**  | Relational DB      | `@langchain/postgres`       | Structured storage, easy indexing        |
| **JSON File** | Local storage      | `FileChatMessageHistory`    | Simple local persistence for dev/testing |

**Key Points:**

- Persistence allows memory to survive program restarts.
- Each session or user should have a unique `sessionId`.
- `BufferMemory` or `EntityMemory` can wrap the persisted chat history for chain usage.

---

## 5. Micro-projects Coverage

| Project                | Memory Type                    | Outcome / Learning                                            |
| ---------------------- | ------------------------------ | ------------------------------------------------------------- |
| Basic Chatbot          | ConversationBufferMemory       | Shows context maintained vs. stateless chain                  |
| Sliding Window Chatbot | ConversationBufferWindowMemory | Demonstrates windowing for context size management            |
| Summarizing Chatbot    | ConversationSummaryMemory      | Handles long conversations with LLM-generated summaries       |
| Entity Tracker Bot     | EntityMemory                   | Tracks and recalls user/entity information across turns       |
| Persisted Memory Bot   | BufferMemory + Redis           | Memory survives restarts; can reload previous session history |

---

## 6. Notes / Takeaways

- **Memory vs Chains**: Memory is an auxiliary module; chains are the orchestration logic. Memory is injected into chains.
- **Customization**: You can extend `BaseMemory` to implement custom behaviors.
- **Combination**: `CombinedMemory` allows layering different memory types for more advanced scenarios.
- **Persistence**: Demonstrates practical deployment capability – not limited to Redis, can adapt to any DB.
- **Scalability**: Summary memory or vector memory should be preferred for long-term, high-volume conversations.

# 🧩 Stage 6.4 – Persistence Layer (Mongo + Context Store)

## 🎯 Goal

Store chats, tasks, and memory snapshots in MongoDB for continuity and analytics.

---

## Coverage Plan

| Sub-section                           | Focus Area                                                             | Deliverable           |
| ------------------------------------- | ---------------------------------------------------------------------- | --------------------- |
| **6.4.1 – Mongo Setup & Models**      | Define Mongoose schemas for `User`, `Chat`, `Message`, `Task`.         | `/models` folder      |
| **6.4.2 – Persistent Memory Adapter** | Wrap LangChain memory with Mongo persistence (store last N exchanges). | `MongoMemoryStore.ts` |
| **6.4.3 – API Extension for Chats**   | `/api/chats` routes → list, get history, delete conversation.          | CRUD endpoints        |
| **6.4.4 – Frontend Integration**      | Optional “Chat History” view, load previous session context.           | Minimal UI            |

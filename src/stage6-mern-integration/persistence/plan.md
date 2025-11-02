# 🧩 Stage 6.4 – Persistence Layer (Mongo + Context Store)

## 🎯 Goal

Store chats, tasks, and memory snapshots in MongoDB for continuity and analytics.

---

## Coverage Plan

| Sub-Stage                         | Focus Area                                                                    | Deliverable                             | Depth Level    |
| --------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- | -------------- |
| **6.4.1 – MongoDB Setup**         | Connect backend to MongoDB Atlas via Mongoose ORM                             | `db.ts` + .env config                   | 🟢 Light       |
| **6.4.2 – Chat Model & Schema**   | Design `ChatSession`, `Message` schemas                                       | `models/chatSession.model.ts`           | 🟢 Medium      |
| **6.4.3 – Persistence API**       | Create `/api/chat` endpoints for create/read/update sessions                  | `chat.controller.ts` + `chat.routes.ts` | 🟡 Medium      |
| **6.4.4 – Integrate with Memory** | Replace `BufferMemory`’s ephemeral messages with a DB-backed retriever memory | Hybrid memory wrapper                   | 🟠 Medium-High |
| **6.4.5 – Frontend Persistence**  | Fetch user chat history and allow resume of past sessions                     | Chat History Sidebar UI                 | 🟢 Light       |

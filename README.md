# LangChain Ecosystem Learning

## Overview

This repository is a structured learning journey for **LangChain and its ecosystem**, including LangGraph and LangSmith.  
It is designed to provide both **theoretical understanding** and **hands-on practice** through micro-projects and a final capstone project.

The roadmap is organized into **stages**, each covering a specific concept, with micro-projects to reinforce learning. The full stack MERN integration is included to practice real-world usage.

---

## 🚀 Roadmap Stages

| Stage | Topic                              | Micro-Project                                                                                                                     |
| ----- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Foundations & Core Building Blocks | Hello LangChain: Wrap OpenAI in LangChain, compare raw API vs LangChain, log tokens & latency                                     |
| **2** | Prompt Templates & Chains          | Text Transformer: Input → Rephrase → Summarize → Translate (SequentialChain & RouterChain)                                        |
| **3** | LangChain Agents                   | Agents Lab: Calculator Agent, Search Agent, Hybrid Q&A Agent                                                                      |
| **4** | Tools & Custom Integrations        | GitHub Assistant Agent: Fetch repo stats, calculate stars/month, answer questions                                                 |
| **5** | Memory Systems & RAG               | Support Chatbot with Memory & RAG: remembers last 3 chats, stores sessions, retrieves using vector store                          |
| **6** | LangChain + MERN Integration       | Chat API with backend endpoints (summarizer, translator, agent) + React frontend streaming chat UI                                |
| **7** | LangGraph Orchestration            | Task Planner Graph: nodes = planner → executor → memory, multi-tool orchestration with control flow                               |
| **8** | LangSmith Debugging & Monitoring   | Debugging Playground: Run chain/agent with LangSmith, visualize tool usage, token costs, latency                                  |
| **9** | Capstone Project                   | Developer Assistant Agent Platform (MERN): Conversational agent with memory, tools, LangGraph orchestration, LangSmith monitoring |

---

## 🛠️ Setup Instructions

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd langchain-ecosystem-learning
```

### 2. Initialize Node.js project

```bash
yarn init -y
```

### 3. Install required dependencies

```bash
# LangChain + OpenAI
yarn add langchain openai

# MERN stack dependencies for later stages
yarn add express cors axios
yarn add react react-dom react-scripts tailwindcss @types/react @types/react-dom -D

# TypeScript & dev tools
yarn add -D typescript ts-node @types/node

# Optional: Vector store (for RAG / Memory)
yarn add pinecone-client weaviate-client redis

# Optional: LangSmith & LangGraph dependencies
# (update as per latest versions)
yarn add @langsmith/langsmith @langgraph/langgraph
```

### 4. Initialize TypeScript

```bash
yarn tsc --init
```

Update `tsconfig.json` with recommended settings for Node + ES modules:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "commonjs",
		"moduleResolution": "node",
		"outDir": "./dist",
		"rootDir": "./",
		"strict": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true
	}
}
```

### 5. Setup Tailwind (for frontend stages)

```bash
yarn tailwindcss init -p
```

Configure `tailwind.config.js` to include your `src` folder.

### 6. Add scripts to `package.json`

```json
"scripts": {
  "start:ts": "ts-node",
  "build": "tsc",
  "start:dev": "ts-node src/index.ts"
}
```

---

## 📁 Repo Structure

```
langchain-ecosystem-learning/
│
├── shared/                    # Reusable utils, types, config
├── stage1-foundations/        # Foundations & Core Building Blocks
├── stage2-chains/             # Prompt Templates & Chains
├── stage3-agents/             # LangChain Agents
├── stage4-tools/              # Tools & Custom Integrations
├── stage5-memory-rag/         # Memory Systems + RAG
├── stage6-mern-integration/   # MERN Integration
├── stage7-langgraph/          # LangGraph Orchestration
├── stage8-langsmith/          # LangSmith Debugging & Monitoring
└── stage9-capstone/           # Unified Developer Assistant Agent
```

---

## ✅ Notes

1. Each stage contains its own folder and `README.md` describing objectives and micro-project tasks.
2. `shared/` contains reusable utilities (token logging, helpers, API clients, types).
3. Code is written in **TypeScript** for type safety.
4. Token usage, latency, and logging are encouraged in all micro-projects.
5. For MERN stages, backend APIs and React frontend are separated for modularity.

---

Once this setup is ready, we can start **Stage 1 – Foundations & Core Building Blocks** with **hello-langchain.ts**.
It will include:

- Wrapping OpenAI with LangChain
- Comparing raw API vs LangChain
- Logging tokens & response latency

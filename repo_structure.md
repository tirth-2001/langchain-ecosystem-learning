# Repo Structure

```graphql
langchain-ecosystem-learning/
│
├── README.md # Overview of roadmap, stages, micro-projects, setup instructions
├── package.json # Node.js project setup (TypeScript, scripts, dependencies)
├── tsconfig.json # TypeScript configuration
├── .gitignore
│
├── shared/ # Shared utilities, types, constants
│ ├── utils.ts # Common helper functions (token logger, API caller, etc.)
│ ├── types.ts # Shared TypeScript types/interfaces
│ └── config.ts # API keys, endpoints, env config
│
├── stage1-foundations/ # Foundations & Core Building Blocks
│ ├── README.md
│ └── hello-langchain.ts # Wrap OpenAI, compare raw API vs LangChain, log tokens & latency
│
├── stage2-chains/ # Prompt Templates & Chains
│ ├── README.md
│ └── text-transformer.ts # SequentialChain & RouterChain example (Rephrase → Summarize → Translate)
│
├── stage3-agents/ # LangChain Agents
│ ├── README.md
│ ├── calculator-agent.ts
│ ├── search-agent.ts
│ └── hybrid-qna-agent.ts
│
├── stage4-tools/ # Tools & Custom Integrations
│ ├── README.md
│ └── github-assistant-agent.ts
│
├── stage5-memory-rag/ # Memory Systems + RAG
│ ├── README.md
│ ├── chatbot-memory.ts
│ └── rag-retrieval.ts
│
├── stage6-mern-integration/ # LangChain + MERN Integration
│ ├── README.md
│ ├── backend/ # Express API endpoints
│ │ ├── index.ts
│ │ ├── summarizer.ts
│ │ ├── translator.ts
│ │ └── agent.ts
│ └── frontend/ # React chat UI with Tailwind
│ ├── App.tsx
│ ├── components/
│ │ ├── ChatBox.tsx
│ │ └── MessageBubble.tsx
│ └── styles/
│
├── stage7-langgraph/ # LangGraph Orchestration
│ ├── README.md
│ └── task-planner-graph.ts
│
├── stage8-langsmith/ # LangSmith Debugging & Monitoring
│ ├── README.md
│ └── debug-playground.ts
│
└── stage9-capstone/ # Unified Developer Assistant Agent
├── README.md
├── backend/ # Full backend integration (tools + agents + memory + LangGraph)
└── frontend/ # Full frontend chat UI with streaming
```

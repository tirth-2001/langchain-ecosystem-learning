stage3-agents/
│
├── plan.md # Overview of Stage 3, theory + learning outcomes
├── repo_structure.md # This file - current structure overview
│
├── agent-types/ # Core agent implementations
│ ├── notes/ # Documentation for each agent type
│ │ ├── ReAct-agent.md
│ │ ├── Plan-and-Execute-agent.md
│ │ └── Structured-agent.md
│ ├── ReAct-agent.ts # Demo: ReAct Agent
│ ├── Plan-and-Execute-agent.ts # Demo: Plan-and-Execute Agent
│ ├── Structured-agent.ts # Demo: Structured Agent
│ ├── ReAct-multi-tool-assistant.ts # Demo: ReAct with multiple tools
│ └── travel-assistant-plan-and-execute.ts # Demo: Travel assistant using Plan-and-Execute
│
└── notes/ # Additional documentation and theory
├── agent-foundations.md # Theory: Agent loop, chains vs agents, executor basics
├── agent-executors.md # Theory: Executor options, streaming, verbose logging
└── agent-patterns.md # Common agent patterns and best practices

**Note:** Tools & Custom Integrations have been moved to **stage4-tools/** to align with the ROADMAP structure.

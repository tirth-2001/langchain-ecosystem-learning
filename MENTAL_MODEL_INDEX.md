# 🧠 **CUMULATIVE MENTAL MODEL INDEX — GEN AI SYSTEMS**

> **How to read this table**

- **Mental Model** = one-liner abstraction you should remember forever
- **Applies To** = where this concept shows up again
- **Pitfalls / Edge Cases** = where most people break things
- **Why It Matters** = leverage gained by internalizing it

---

## 🟦 PROMPT ENGINEERING / PROMPTOPS

| Topic          | Mental Model                                                  | Applies To                 | Pitfalls / Edge Cases            | Why It Matters                |
| -------------- | ------------------------------------------------------------- | -------------------------- | -------------------------------- | ----------------------------- |
| Prompt roles   | System > Developer > User > Assistant is a _policy hierarchy_ | All LLM frameworks         | Mixing instructions across roles | Prevents instruction override |
| Prompt ≠ query | Prompt is a **program**, not a question                       | Agents, RAG                | Treating prompts as strings      | Enables reuse & versioning    |
| Few-shot       | Examples are **behavior constraints**                         | Classification, extraction | Overfitting to examples          | Improves determinism          |
| Overprompting  | More tokens ≠ better output                                   | RAG, agents                | Long prompts reduce reasoning    | Keeps latency + cost sane     |
| Hallucination  | LLM fills gaps unless grounded                                | RAG                        | Trusting model memory            | Forces retrieval grounding    |
| Output format  | Structure must be _enforced_, not requested                   | APIs, tools                | “Please return JSON”             | Enables machine-readability   |

---

## 🟦 LANGCHAIN CORE

| Topic            | Mental Model                       | Applies To     | Pitfalls / Edge Cases         | Why It Matters        |
| ---------------- | ---------------------------------- | -------------- | ----------------------------- | --------------------- |
| LangChain        | **Orchestration layer**, not AI    | All stacks     | Thinking LC adds intelligence | Correct expectations  |
| RunnableSequence | Pipelines = functional composition | LangGraph      | Side effects inside runnables | Predictable execution |
| PromptTemplate   | Template = contract                | Chains, agents | Hardcoding strings            | Safe prompt evolution |
| Streaming        | Token stream ≠ message             | Frontend       | Broken whitespace             | UX correctness        |
| LLM abstraction  | Model is a pluggable dependency    | Prod systems   | Vendor lock-in                | Future-proofing       |

---

## 🟦 MEMORY SYSTEMS

| Topic          | Mental Model                      | Applies To | Pitfalls / Edge Cases | Why It Matters       |
| -------------- | --------------------------------- | ---------- | --------------------- | -------------------- |
| Memory         | Memory = **state**, not knowledge | Chatbots   | Using memory as DB    | Avoids hallucination |
| BufferMemory   | Short-term RAM                    | Agents     | Token overflow        | Simplicity           |
| WindowMemory   | Sliding context                   | Chat       | Wrong window size     | Cost control         |
| SummaryMemory  | Compression via abstraction       | Long chats | Lossy summaries       | Scalability          |
| EntityMemory   | Facts ≠ conversation              | Assistants | Entity drift          | Personalization      |
| CombinedMemory | Memory is layered                 | Prod apps  | Overengineering       | Balance              |
| Persistence    | Memory must outlive process       | Real apps  | In-memory only        | Reliability          |

---

## 🟦 RAG (RETRIEVAL)

| Topic        | Mental Model             | Applies To    | Pitfalls / Edge Cases | Why It Matters        |
| ------------ | ------------------------ | ------------- | --------------------- | --------------------- |
| RAG          | Retrieval ≠ memory       | QA systems    | Mixing concepts       | Correct architecture  |
| Chunking     | Chunks = reasoning units | Vector DBs    | Too big / too small   | Retrieval quality     |
| Embeddings   | Semantic coordinates     | Search        | Comparing raw text    | Meaningful similarity |
| Vector store | Index ≠ knowledge        | FAISS, Chroma | Treating as DB        | Performance           |
| Retriever    | Search policy            | RAG           | Blind top-k           | Precision             |
| RAG chain    | Context injection        | QA            | Prompt overflow       | Grounded answers      |

---

## 🟦 AGENTS & TOOLS

| Topic            | Mental Model                      | Applies To | Pitfalls / Edge Cases | Why It Matters     |
| ---------------- | --------------------------------- | ---------- | --------------------- | ------------------ |
| Agent            | LLM + loop + tools                | Automation | Over-trusting LLM     | Control            |
| Tool             | Tool = _capability_, not function | Agents     | Tool spam             | Safety             |
| Tool description | Descriptions are routing logic    | Agents     | Vague descriptions    | Correct tool usage |
| Tool errors      | Errors must be _first-class_      | Prod       | Silent failures       | Resilience         |
| AgentExecutor    | Policy runner                     | LangChain  | Old APIs              | Stability          |

---

## 🟦 MERN + LLM INTEGRATION

| Topic           | Mental Model                      | Applies To | Pitfalls / Edge Cases | Why It Matters     |
| --------------- | --------------------------------- | ---------- | --------------------- | ------------------ |
| Backend         | LLM ≠ controller                  | APIs       | Fat controllers       | Clean architecture |
| Streaming (SSE) | Stream = event protocol           | UI         | Chunk loss            | UX                 |
| Frontend        | UI consumes _events_, not strings | Chat       | Rendering per token   | Performance        |
| Tasks           | Tasks = async AI jobs             | Apps       | Blocking calls        | Scalability        |
| Persistence     | Chat = timeline, not blob         | MongoDB    | Overwriting history   | Replay & audit     |

---

## 🟦 LANGGRAPH FUNDAMENTALS

| Topic       | Mental Model                       | Applies To   | Pitfalls / Edge Cases | Why It Matters |
| ----------- | ---------------------------------- | ------------ | --------------------- | -------------- |
| LangGraph   | Graph = deterministic intelligence | Agents       | Expecting magic       | Control        |
| Node        | Node = pure state transformer      | All graphs   | Side effects          | Predictability |
| Edge        | Edge = allowed transition          | Control flow | Implicit routing      | Safety         |
| State       | State = single source of truth     | Graphs       | Hidden variables      | Debugging      |
| Reducer     | Reducer defines truth accumulation | Memory       | Wrong reducer logic   | Correct state  |
| START / END | Graph must be reachable            | All graphs   | Missing START edge    | Runtime safety |

---

## 🟦 CONTROL FLOW (LANGGRAPH)

| Topic             | Mental Model                  | Applies To | Pitfalls / Edge Cases | Why It Matters |
| ----------------- | ----------------------------- | ---------- | --------------------- | -------------- |
| Conditional edges | LLM can route, graph enforces | Routing    | Too many branches     | Determinism    |
| Loops             | Loop = retry policy           | Planning   | Infinite loops        | Safety         |
| Retries           | Retry is policy, not hope     | Tools      | Blind retries         | Reliability    |
| Parallel nodes    | Parallelism = fan-out/fan-in  | Speed      | Race conditions       | Performance    |
| Guardrails        | Graphs must self-limit        | Prod       | Runaway agents        | Cost & safety  |

---

## 🟦 HITL (HUMAN-IN-THE-LOOP)

| Topic          | Mental Model                 | Applies To   | Pitfalls / Edge Cases | Why It Matters |
| -------------- | ---------------------------- | ------------ | --------------------- | -------------- |
| HITL           | Human = decision oracle      | Review flows | Blocking UI           | Trust          |
| interrupt()    | Interrupt = control transfer | LangGraph    | Edge-based pause      | Correct resume |
| Command.resume | Resume injects _value_       | LangGraph    | Losing state          | Continuity     |
| Checkpoint     | Resume requires persistence  | Prod         | Missing checkpointer  | Correctness    |

---

## 🟦 MULTI-AGENT SYSTEMS

| Topic               | Mental Model                   | Applies To    | Pitfalls / Edge Cases | Why It Matters |
| ------------------- | ------------------------------ | ------------- | --------------------- | -------------- |
| Planner agent       | Planner = task decomposer      | Crew AI       | Overplanning          | Efficiency     |
| Executor agent      | Worker = capability            | Automation    | Overgeneral agents    | Reliability    |
| Shared memory       | Memory = collaboration surface | Teams         | Conflicting writes    | Coherence      |
| Supervisor          | Supervisor = dispatcher        | Orchestration | God-agent             | Scalability    |
| Long-running agents | Agent = service, not call      | Assistants    | Stateless design      | Real autonomy  |

---

## 🟦 META-LEARNING / SYSTEM THINKING

| Topic              | Mental Model               | Applies To  | Pitfalls / Edge Cases  | Why It Matters |
| ------------------ | -------------------------- | ----------- | ---------------------- | -------------- |
| Abstraction lock   | Freeze models aggressively | Learning    | Re-learning same thing | Speed          |
| Parking topics     | Not everything now         | Mastery     | Completionism          | Momentum       |
| Prediction layer   | Predict failures first     | Debugging   | Trial-only learning    | Depth          |
| Learning ROI       | Optimize for leverage      | Career      | Chasing trends         | Focus          |
| Framework literacy | Learn patterns, not tools  | Future tech | Tool dependency        | Longevity      |

---

## 🧭 FINAL NOTE

This Mental Model Index is **not static**.

The top 1% habit is:

> Update this table **only when a model breaks**.

If a new framework appears and **nothing here changes**, you’ve won.

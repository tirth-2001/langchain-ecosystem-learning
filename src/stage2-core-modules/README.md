# 📌 Stage 2 – Prompt Templates, Chains & Memory (LangChain)

## **Overview**

Stage 2 focuses on **LangChain core modules**: prompt templates, chain building, and memory management. The goal is to understand how to design prompts, orchestrate multi-step LLM workflows, and manage state/context for LLM applications.

The stage is broken down into:

1. **Prompt Templates**
2. **Chains**
3. **Memory**

Each topic includes theory, examples, and a micro-project to solidify learning.

---

## **2.1 Prompt Templates**

| Topic                     | Theory Focus                                                             | Micro-project / Demo                                           |
| ------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **PromptTemplate**        | Basic template with input variables; used for single-step LLM input      | `TextTransformerService` (Stage 2 code: `text-transformer.ts`) |
| **ChatPromptTemplate**    | Specialized for chat LLMs; manages system + user messages                | Covered in `chat-prompt-template-demo.ts`                      |
| **MessagePromptTemplate** | Constructs prompts at message-level for multi-turn interactions          | Covered in `message-prompt-template-demo.ts`                   |
| **FewShotPromptTemplate** | Includes examples to guide LLM reasoning                                 | FewShot template demo (`fewshot-prompt-template.ts`)           |
| **OutputParsers**         | Parse model outputs to structured formats (JSON, string, custom parsers) | Demo in `output-parsers-demo.ts`                               |
| **Prompt Serialization**  | Save & reload prompt templates using `toJSON` / `fromJSON`               | Serialization demo (`prompt-serialization-demo.ts`)            |

**Key takeaways:**

- ChatPromptTemplate & MessagePromptTemplate are for **structured conversations**.
- FewShotPromptTemplate helps LLM **learn patterns via examples**.
- OutputParsers ensure LLM output is **consistent and machine-readable**.

---

## **2.2 Chains**

| Topic                       | Theory Focus                                           | Micro-project / Demo                                          |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| **LLMChain**                | Single-step chain execution                            | Demo: `hello-langchain.ts`                                    |
| **SequentialChain**         | Linear multi-step chaining (input → step1 → step2 → …) | `text-transformer.ts` (Rephrase → Summarize → Translate)      |
| **RouterChain**             | Route input to multiple chains based on classification | Parked due to API/TS issues (Runnable-based routing explored) |
| **MapReduceDocumentsChain** | Summarize documents by map → reduce pattern            | `mapreduce-demo.ts`                                           |
| **TransformChain**          | Transform output between chain steps                   | Demo: `transform-chain-demo.ts`                               |
| **Custom Chains (LCEL)**    | RunnableSequence / RunnableBranch for custom pipelines | LCEL demo: `lcel-custom-chains.ts`                            |

**Key takeaways:**

- SequentialChain is good for **linear workflows**.
- TransformChain and LCEL chains allow **custom processing logic** between LLM steps.
- RouterChain is intended for **dynamic branching**, but parked for later.

---

## **2.3 Memory**

| Memory Type                        | Description                                       | Micro-project / Demo                       |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| **ConversationBufferMemory**       | Keeps all messages in memory                      | `conversation-buffer-memory-demo.ts`       |
| **ConversationBufferWindowMemory** | Keeps last _k_ interactions                       | `buffer-window-memory-demo.ts`             |
| **ConversationTokenBufferMemory**  | Stores messages up to token limit                 | `token-buffer-memory-demo.ts`              |
| **ConversationSummaryMemory**      | Summarizes older messages                         | `summary-memory-demo.ts`                   |
| **CombinedMemory**                 | Mix multiple memory types                         | `combined-memory-demo.ts`                  |
| **EntityMemory**                   | Track facts about entities across sessions        | `entity-memory-demo.ts`                    |
| **VectorStore-backed Memory**      | Retrieval-based memory (linked to RAG in Stage 5) | Conceptually covered; full demo in Stage 5 |
| **Persistence (Redis/JSON)**       | Save/load memory across sessions                  | `redis-memory-persistence-demo.ts`         |

**Micro-projects:**

1. **Basic Chatbot** → Demonstrates BufferMemory and conversation context
2. **Sliding Window Chatbot** → Demonstrates WindowMemory
3. **Summarizing Chatbot** → Handles long conversations via ConversationSummaryMemory
4. **Entity Tracker Bot** → Demonstrates EntityMemory across sessions
5. **Persisted Memory Bot** → Saves and reloads memory using Redis

**Key takeaways:**

- Memory is critical for **contextual LLM apps**.
- Core memory types (Buffer, Window, Token, Summary) manage conversation context differently.
- CombinedMemory & EntityMemory provide **advanced memory orchestration**.
- Persistence allows **memory across app restarts**.

---

## **Stage 2 Completion Status**

| Section              | Status              | Notes                                          |
| -------------------- | ------------------- | ---------------------------------------------- |
| 2.1 Prompt Templates | ✅ Completed        | Covers all core template types & parsers       |
| 2.2 Chains           | ✅ Mostly completed | RouterChain parked; LCEL custom chains done    |
| 2.3 Memory           | ✅ Completed        | Includes Redis persistence; other DBs optional |

---

## **Summary of Micro-Projects / Demos**

| Demo                         | Stage / File                                    | Focus                                                     |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| Hello LangChain              | Stage1 / `hello-langchain.ts`                   | LLMChain, raw API comparison, token/time logging          |
| Text Transformer Service     | Stage2 / `text-transformer.ts`                  | SequentialChain, multi-step transformation                |
| Output Parsers Demo          | Stage2 / `output-parsers-demo.ts`               | Structured output parsing                                 |
| LCEL Custom Chains           | Stage2 / `lcel-custom-chains.ts`                | RunnableSequence / RunnableBranch, custom chain pipelines |
| ConversationBufferMemory Bot | Stage2.3 / `conversation-buffer-memory-demo.ts` | Maintains conversation state                              |
| Sliding Window Chatbot       | Stage2.3 / `buffer-window-memory-demo.ts`       | Windowed memory                                           |
| Summarizing Chatbot          | Stage2.3 / `summary-memory-demo.ts`             | Summarizes old messages                                   |
| Entity Tracker Bot           | Stage2.3 / `entity-memory-demo.ts`              | Tracks entity-specific facts                              |
| Persisted Memory Bot         | Stage2.3 / `redis-memory-persistence-demo.ts`   | Memory persistence with Redis                             |

---

## **Key Takeaways for Stage 2**

- **Prompt templates** provide flexibility for single/multi-turn LLM interactions.
- **Chains** enable stepwise orchestration of LLMs for complex workflows.
- **Memory modules** maintain context and state across conversations and sessions.
- **Micro-projects** demonstrate practical implementation of these concepts.
- Stage 2 provides **breadth + depth** in LangChain core before moving to **Agents (Stage 3)**, **Tools (Stage 4)**, and **RAG/Vector Stores (Stage 5)**.

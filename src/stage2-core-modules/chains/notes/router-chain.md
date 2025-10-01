# 📚 RouterChain – Theory

---

## 1. What is RouterChain?

A **RouterChain** lets you **dynamically select which chain to run** based on the input.

Instead of running every chain sequentially, you can:

- Inspect the user input
- Decide which chain (or tool) is most appropriate
- Route the input only to that chain

**Use cases:**

- Multi-lingual chatbot → route to translation chain if input isn’t English
- Multi-function assistant → route to summarizer, calculator, or search agent
- Conditional logic in pipelines → save tokens/time by running only relevant chains

---

## 2. How it Works in LangChain

- **RouterChain** is a special chain that outputs:

  - `destination` → which chain to call
  - `next_inputs` → variables to pass to that chain

- Typically used with:

  - `LLMChain` or `ChatPromptTemplate` for routing decision
  - Other chains as “destination chains”

**High-level flow:**

```
Input → RouterChain → DestinationChain → Output
```

---

## 3. Components of RouterChain

1. **Routing LLM**

   - LLM that decides which chain to run
   - Input: raw user query
   - Output: JSON with `destination` & `next_inputs`

2. **Destination Chains**

   - Pre-defined chains that handle specific tasks
   - Examples: `SummarizeChain`, `TranslateChain`, `RephraseChain`

3. **RouterChain Class**

   - Connects routing LLM with destination chains
   - Handles passing inputs and returning output

---

# 🛠️ Micro-Project: RouterChain Demo

**Goal:** Route input text dynamically to Summarizer or Translator.

`Code in router-chain-demo.ts`

---

### ✅ Expected Output

```json
// Input 1 (English)
{
  "summary": "LangChain makes it easier to build applications using large language models."
}

// Input 2 (French)
{
  "translation": "Bonjour, comment ça va aujourd'hui ?"
}
```

---

### 💡 Notes

1. **RouterChain can scale:** Add more chains like `CalculatorChain`, `SearchChain`, etc.
2. **Dynamic input variables:** RouterChain can modify inputs before passing to destination chain.
3. **Error handling:** You can provide a `defaultChain` if router LLM fails to decide.

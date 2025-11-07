# 🎓 LangGraph Theory: Reducers & State Management

## Table of Contents

1. [The Core Misconceptions](#misconceptions)
2. [How Reducers Actually Work](#how-reducers-work)
3. [State Flow Deep Dive](#state-flow)
4. [When Reducers Are (and Aren't) Called](#reducer-invocation)
5. [Common Mental Models (Wrong vs Right)](#mental-models)
6. [Practical Guidelines](#guidelines)

---

## 🚨 The Core Misconceptions {#misconceptions}

### **Misconception #1: Single-Parameter Reducers**

❌ **WRONG CONCEPT:**

```typescript
reducer: (x: string) => x // Only one parameter!
```

**Why it's wrong:**

- Reducers ALWAYS receive TWO parameters: `(current, update)`
- Single-parameter syntax is incomplete and leads to bugs
- You lose access to the current state

✅ **CORRECT CONCEPT:**

```typescript
reducer: (current: string, update: string) => update
```

**What each parameter means:**

- `current`: The EXISTING value in the state (before this update)
- `update`: The NEW value being applied (from node or initial input)
- Return value: The FINAL value that will be stored

---

### **Misconception #2: "Reducer Transforms State"**

❌ **WRONG MENTAL MODEL:**

> "The reducer transforms my state as it flows through the graph"

**Why it's wrong:**

- Reducers don't "transform state as it flows"
- Reducers **merge/combine updates** when changes happen
- The node function does the transformation

✅ **CORRECT MENTAL MODEL:**

> "The reducer decides HOW to combine a new update with existing state"

**Example:**

```typescript
// Node: Transforms data (business logic)
async function node(state) {
  return { count: state.count * 2 } // Transform!
}

// Reducer: Merges the update (no business logic)
reducer: (current, update) => update // Just replace
```

---

### **Misconception #3: "Reducer Runs on Every Node"**

❌ **WRONG CONCEPT:**

> "My reducer will run for every node execution"

**Why it's wrong:**

- Reducers only run when a node RETURNS that specific field
- If a node doesn't return a field, its reducer is NOT invoked
- This is called "partial updates"

✅ **CORRECT CONCEPT:**

> "A field's reducer runs ONLY when that field is updated"

**Example:**

```typescript
// State has: field1, field2, field3

async function nodeA(state) {
  return { field1: 'x' }
  // ✅ field1 reducer called
  // ❌ field2 reducer NOT called
  // ❌ field3 reducer NOT called
}
```

---

### **Misconception #4: "Reducers Transform Input Too"**

❌ **WRONG CONCEPT:**

> "If I have a uppercase reducer, my input will arrive uppercased to the first node"

**Why it's wrong:**

- The initial input DOES go through reducers
- BUT the first node receives the POST-reducer state
- This is actually CORRECT behavior (you had the right idea!)

✅ **CORRECT CONCEPT:**

```typescript
// Flow with reducer that uppercases:
invoke({ msg: 'hello' })           // 1. Input
  → reducer('', 'hello')            // 2. Reducer: '' + 'hello' -> 'HELLO'
  → node receives 'HELLO'           // 3. Node sees transformed input
  → node returns 'HELLO world'      // 4. Node returns
  → reducer('HELLO', 'HELLO world') // 5. Reducer again
  → final: 'HELLO WORLD'            // 6. Result
```

---

## 🔧 How Reducers Actually Work {#how-reducers-work}

### **The Reducer Signature**

```typescript
type Reducer<T> = (currentState: T, incomingUpdate: T) => T
```

**Every reducer must:**

1. Accept TWO parameters (even if you ignore one)
2. Return a value of the same type
3. Be pure (no side effects)
4. Not mutate inputs (return new objects/arrays)

### **When Reducers Are Invoked**

A reducer for field `X` is called when:

1. **Initial input** contains field `X`

   ```typescript
   invoke({ X: value }) → reducer(undefined, value)
   ```

2. **A node returns** field `X`

   ```typescript
   node returns { X: newValue } → reducer(currentX, newValue)
   ```

3. **Multiple nodes in parallel** update field `X`
   ```typescript
   // Both nodes return X
   nodeA → {X: 'a'} → reducer(current, 'a')
   nodeB → {X: 'b'} → reducer(result_from_A, 'b')
   ```

### **When Reducers Are NOT Invoked**

A reducer is NOT called when:

1. **Node doesn't return that field** (partial update)
2. **Field wasn't in initial input** and no node has returned it yet
3. **Graph ends** (reducers don't run on final output)

---

## 🌊 State Flow Deep Dive {#state-flow}

### **Complete Execution Flow**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INVOKES GRAPH                                       │
│    graph.invoke({ field1: 'a', field2: 'b' })               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. INITIAL STATE PROCESSING                                 │
│    For each field in input:                                 │
│      reducer(undefined, inputValue) → initialState          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. NODE EXECUTION                                           │
│    node(currentState) → returns { field1: 'new' }           │
│    (Note: Only returns fields it wants to update)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. REDUCER APPLICATION                                      │
│    For each field in node's return value:                   │
│      newState[field] = reducer(currentState[field], update) │
│                                                             │
│    Fields NOT in return value → keep current value          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. STATE UPDATE                                             │
│    currentState = newState                                  │
│    (This becomes input for next node)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    More Nodes?              Graph END?
        │                         │
        │                         ▼
        └─────────────────► Return Final State
```

### **Example Trace**

```typescript
// State Definition
const State = Annotation.Root({
  messages: Annotation<string[]>({
    reducer: (curr, upd) => [...(curr || []), ...(upd || [])],
  }),
  count: Annotation<number>({
    reducer: (curr, upd) => upd, // Replace
  }),
})

// Initial invoke
graph.invoke({ messages: ['hello'], count: 0 })

// Step-by-step:
//
// STEP 1: Process initial input
//   messages reducer: (undefined, ['hello']) → ['hello']
//   count reducer: (undefined, 0) → 0
//   State = { messages: ['hello'], count: 0 }
//
// STEP 2: Node A executes
//   Node receives: { messages: ['hello'], count: 0 }
//   Node returns: { messages: ['from A'] }  ← Only messages!
//
//   messages reducer: (['hello'], ['from A']) → ['hello', 'from A']
//   count reducer: NOT CALLED (not in return)
//   State = { messages: ['hello', 'from A'], count: 0 }
//
// STEP 3: Node B executes
//   Node receives: { messages: ['hello', 'from A'], count: 0 }
//   Node returns: { count: 42 }  ← Only count!
//
//   messages reducer: NOT CALLED
//   count reducer: (0, 42) → 42
//   State = { messages: ['hello', 'from A'], count: 42 }
//
// FINAL: { messages: ['hello', 'from A'], count: 42 }
```

---

## 🎯 When Reducers Are (and Aren't) Called {#reducer-invocation}

### **Decision Tree**

```
Does the node return field X?
│
├─ YES → Call reducer for field X
│         reducer(currentState.X, nodeReturn.X)
│         Update state with result
│
└─ NO → Skip reducer for field X
        Keep currentState.X unchanged
```

### **Examples**

#### **Example 1: Selective Updates**

```typescript
const State = Annotation.Root({
  a: Annotation<string>({
    reducer: (c, u) => {
      console.log('A reducer')
      return u
    },
  }),
  b: Annotation<number>({
    reducer: (c, u) => {
      console.log('B reducer')
      return u
    },
  }),
})

async function node1(state) {
  return { a: 'updated' } // Only A
}

async function node2(state) {
  return { b: 42 } // Only B
}

// Execution:
// invoke({ a: 'x', b: 0 })
//   → "A reducer", "B reducer" (initial input)
//
// node1 executes
//   → "A reducer" (only A returned)
//   → B reducer NOT called
//
// node2 executes
//   → "B reducer" (only B returned)
//   → A reducer NOT called
```

#### **Example 2: Conditional Updates**

```typescript
async function conditionalNode(state) {
  if (state.value > 10) {
    return { value: state.value * 2, log: ['doubled'] }
    // ✅ Both reducers called
  } else {
    return { log: ['skipped'] }
    // ✅ Only log reducer called
    // ❌ value reducer NOT called
  }
}
```

---

## 🧠 Mental Models (Wrong vs Right) {#mental-models}

### **Model 1: State as a River**

❌ **WRONG:**

> "State flows through nodes like water, and reducers purify it at each step"

**Problem:** Implies reducers run for all fields at every node

✅ **CORRECT:**

> "State is a container. Nodes add/modify items. Reducers decide how to merge new items when they're added."

---

### **Model 2: Reducer vs Node Responsibility**

❌ **WRONG:**

> "Reducers do data transformation, nodes do I/O operations"

**Problem:** Reducers shouldn't do complex transformations

✅ **CORRECT:**

```
NODE:     "What should I compute/fetch/decide?"
          → Business logic, decisions, API calls

REDUCER:  "How do I combine this update with what I have?"
          → Merge strategies only (append, replace, sum, etc.)
```

---

### **Model 3: Partial Updates**

❌ **WRONG:**

> "Every node must return the complete state"

**Problem:** Forces unnecessary updates and complexity

✅ **CORRECT:**

> "Nodes return only what they change. Other fields stay untouched."

**Visualization:**

```
State: { a: 1, b: 2, c: 3 }

Node returns: { b: 20 }

Result: { a: 1, b: 20, c: 3 }
         ↑      ↑       ↑
         |      |       |
      unchanged updated unchanged
```

---

## 📋 Practical Guidelines {#guidelines}

### **✅ DO: Good Reducer Patterns**

```typescript
// 1. Replace (default)
reducer: (current, update) => update

// 2. Append arrays
reducer: (current, update) => [...(current || []), ...(update || [])]

// 3. Accumulate numbers
reducer: (current, update) => (current || 0) + update

// 4. Merge objects (shallow)
reducer: (current, update) => ({ ...current, ...update })

// 5. Keep first value
reducer: (current, update) => current || update

// 6. Deep merge objects
reducer: (current, update) => deepMerge(current, update)

// 7. Set union
reducer: (current, update) => {
  const set = new Set([...(current || []), ...(update || [])])
  return Array.from(set)
}
```

### **❌ DON'T: Bad Reducer Patterns**

```typescript
// ❌ Business logic in reducer
reducer: (c, u) => {
  if (u > 100) {  // Business rule!
    callAPI(u)    // Side effect!
    return 100
  }
  return u
}

// ❌ Async operations
reducer: async (c, u) => {  // Reducers must be sync!
  const result = await fetch(...)
  return result
}

// ❌ Mutating inputs
reducer: (current, update) => {
  current.push(update)  // Mutating!
  return current
}

// ❌ Complex transformations
reducer: (c, u) => {
  // 50 lines of complex logic
  // This belongs in the node!
}
```

### **Node Design Patterns**

```typescript
// ✅ GOOD: Return only what changed
async function node(state) {
  const result = await computeSomething(state.input)
  return { output: result } // Only output changed
}

// ✅ GOOD: Conditional updates
async function node(state) {
  if (state.needsProcessing) {
    return { data: processedData, status: 'done' }
  }
  return { status: 'skipped' } // Only status changed
}

// ✅ GOOD: Build update from state
async function node(state) {
  const newItems = state.items.filter((x) => x.active)
  return { items: newItems }
}

// ❌ BAD: Trying to use reducer logic in node
async function node(state) {
  // Don't manually merge - that's the reducer's job!
  return {
    items: [...state.items, newItem], // Let reducer do this!
  }
}
```

### **Debugging Checklist**

When state isn't updating as expected:

1. **Is the reducer being called?**

   - Add console.log in reducer
   - Check if node returns that field

2. **Is the reducer signature correct?**

   - Should be `(current, update) => newValue`
   - Not `(x) => x`

3. **Is the node returning the right shape?**

   - Check return value matches state schema
   - Verify field names are correct

4. **Are you mutating state?**

   - Always return NEW objects/arrays
   - Use spread operators: `[...arr]`, `{...obj}`

5. **Is the reducer pure?**
   - No side effects
   - No async operations
   - Same inputs → same output

---

## 🎓 Key Takeaways

1. **Reducers have TWO parameters**: `(current, update) => newValue`
2. **Reducers merge updates**: They don't transform state, they combine updates
3. **Partial updates are normal**: Nodes return only what they change
4. **Business logic in nodes**: Reducers are for merging only
5. **Reducers run selectively**: Only when a field is actually updated
6. **Initial input goes through reducers**: First reducer call has `undefined` as current
7. **Keep reducers simple**: Prefer simple merge strategies
8. **Debug with console.log**: Add logging to understand the flow

---

## 📚 Further Reading

- **LangGraph Docs**: State Management & Reducers
- **Redux Docs**: Reducer patterns (similar concepts)
- **Functional Programming**: Pure functions and immutability
- **State Machines**: Understanding state transitions

---

_This guide corrects common misconceptions and provides a solid mental model for working with LangGraph state management._

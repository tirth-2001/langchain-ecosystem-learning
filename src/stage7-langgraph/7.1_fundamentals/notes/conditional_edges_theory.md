# 🎓 LangGraph Conditional Edges: Complete Theory Guide

## Table of Contents

1. [What Your Guides Got Right](#correct-concepts)
2. [Critical Missing Concepts](#missing-concepts)
3. [How Conditional Edges Actually Work](#deep-dive)
4. [Router Function Deep Dive](#router-functions)
5. [Loop Mechanics & Pitfalls](#loops)
6. [Advanced Patterns](#advanced-patterns)
7. [Mental Models](#mental-models)
8. [Production Considerations](#production)

---

## ✅ What Your Guides Got Right {#correct-concepts}

### **Your Understanding:**

1. ✅ **Basic routing concept** - Using LLM to classify and route
2. ✅ **Conditional edges syntax** - `addConditionalEdges(node, fn, mapping)`
3. ✅ **Loop pattern** - Self-referencing edges for retry logic
4. ✅ **Goal-based termination** - Using state to decide when to exit
5. ✅ **Iteration counter** - Tracking attempts for safety

These are solid foundations! But let's expand on what's missing.

---

## 🚨 Critical Missing Concepts {#missing-concepts}

### **1. Default/Fallback Routes**

❌ **What Your Code Doesn't Handle:**

```typescript
// Your code:
.addConditionalEdges('router', (state) => state.route, {
  general: 'answerer',
  math: 'calculator',
})
// ⚠️ What if route = 'unknown'? → CRASH!
```

✅ **What Should Happen:**

```typescript
.addConditionalEdges(
  'router',
  (state) => state.route || 'fallback', // Default value!
  {
    general: 'answerer',
    math: 'calculator',
    fallback: 'errorHandler', // Handle unexpected routes
  }
)
```

**Why it matters:**

- LLMs can return unexpected values
- Prevents runtime crashes
- Graceful degradation
- Better user experience

---

### **2. Router Function Purity**

❌ **Common Mistake:**

```typescript
// DON'T DO THIS:
.addConditionalEdges('node', (state) => {
  state.routeCount++ // ⚠️ MUTATION!
  console.log('Routing...')  // Side effect
  await fetch('...') // ⚠️ ASYNC not supported!
  return state.route
})
```

✅ **Correct Pattern:**

```typescript
// Router function must be:
// 1. Pure (no side effects)
// 2. Synchronous
// 3. Deterministic (same input → same output)

.addConditionalEdges('node', (state) => {
  // Only READ state, don't modify
  // Return a string key
  return state.route
})
```

**Why it matters:**

- Routers are called during graph compilation and execution
- Side effects lead to unpredictable behavior
- Mutations can corrupt state
- Async operations not supported in router

---

### **3. Infinite Loop Prevention**

Your code has `iterations > 5` check, but it's **not comprehensive enough**.

❌ **Your Pattern:**

```typescript
.addConditionalEdges(
  'checker',
  (state) => state.done ? 'done' : state.iterations > 5 ? 'max_retries' : 'continue'
)
```

**Problems:**

1. What if `iterations` is never incremented properly?
2. What if multiple nodes are in the loop?
3. What if you want different limits for different paths?

✅ **Better Pattern:**

```typescript
// Constants at top of file
const MAX_ITERATIONS = 10
const MAX_RETRIES = 3

// In router function
function safeRouter(state) {
  // Multiple exit conditions
  if (state.done) return 'success'
  if (state.errors > MAX_RETRIES) return 'failed'
  if (state.iterations >= MAX_ITERATIONS) return 'timeout'
  return 'continue'
}

.addConditionalEdges('node', safeRouter, {
  success: END,
  failed: 'errorHandler',
  timeout: 'timeoutHandler',
  continue: 'node', // Loop back
})
```

---

### **4. Early Exit Patterns**

**Missing from your guides:**

You don't show how to exit a loop BEFORE reaching the checker node.

```typescript
// Scenario: Validation fails → skip entire pipeline
async function validateNode(state) {
  if (!state.data) {
    return { shouldContinue: false, error: 'No data' }
  }
  return { shouldContinue: true }
}

.addConditionalEdges('validate',
  (state) => state.shouldContinue ? 'continue' : 'abort',
  {
    continue: 'processNode',
    abort: END, // Early exit!
  }
)
```

**Why it matters:**

- Saves compute time
- Prevents error propagation
- Cleaner error handling
- Better user feedback

---

### **5. Multiple Route Targets from Different States**

**Your code assumes:**

- Each node has 1 conditional edge
- Router returns 1 string

**Reality:**
You can have multiple conditional edges from the same node!

```typescript
const graph = new StateGraph(State)
  .addNode('processor', processNode)

  // Different routing logic for different scenarios
  .addConditionalEdges(
    'processor',
    (state) => {
      if (state.error) return 'error'
      if (state.needsRetry) return 'retry'
      if (state.complete) return 'success'
      return 'continue'
    },
    {
      error: 'errorHandler',
      retry: 'processor', // Self-loop
      success: END,
      continue: 'nextStep',
    },
  )
```

---

### **6. State Must Define All Routes**

**Critical Missing Info:**

The mapping object keys MUST match what your router function returns.

❌ **Runtime Error:**

```typescript
// Router returns 'typeA', 'typeB', or 'unknown'
.addConditionalEdges('node', (state) => state.type, {
  typeA: 'nodeA',
  typeB: 'nodeB',
  // ⚠️ Missing 'unknown' key!
})
// If state.type = 'unknown' → CRASH at runtime!
```

✅ **Safe Pattern:**

```typescript
// Ensure router ALWAYS returns a key that exists in mapping
.addConditionalEdges(
  'node',
  (state) => {
    const validRoutes = ['typeA', 'typeB', 'default']
    return validRoutes.includes(state.type) ? state.type : 'default'
  },
  {
    typeA: 'nodeA',
    typeB: 'nodeB',
    default: 'fallbackNode',
  }
)
```

---

## 🔧 How Conditional Edges Actually Work {#deep-dive}

### **Execution Flow**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. NODE EXECUTES                                            │
│    sourceNode(state) → returns updates                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. STATE UPDATED                                            │
│    State merged with node output via reducers               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ROUTER FUNCTION CALLED                                   │
│    routeKey = routerFn(updatedState)                        │
│    Returns: string key                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. LOOKUP IN MAPPING                                        │
│    nextNode = mapping[routeKey]                             │
│    If key not found → ERROR                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. NEXT NODE EXECUTES                                       │
│    Execute: mapping[routeKey]                               │
│    Special case: if END, stop execution                     │
└─────────────────────────────────────────────────────────────┘
```

### **Key Insight**

**The router function sees the UPDATED state** (after the node's updates are merged).

```typescript
async function myNode(state) {
  return { status: 'processed', count: 5 }
}

.addConditionalEdges(
  'myNode',
  (state) => {
    // state.status = 'processed' (NEW value)
    // state.count = 5 (NEW value)
    return state.status
  }
)
```

---

## 🎯 Router Function Deep Dive {#router-functions}

### **Anatomy of a Router Function**

```typescript
type RouterFunction = (state: State) => string

// Must satisfy:
// 1. Pure function (no side effects)
// 2. Synchronous (cannot be async)
// 3. Returns a string that exists in mapping
// 4. Should handle all possible state values
```

### **Simple Router**

```typescript
;(state) => state.route
// Returns whatever is in state.route
// ⚠️ Dangerous if state.route can be unexpected values
```

### **Safe Router**

```typescript
;(state) => state.route || 'default'
// Always returns valid key
```

### **Conditional Router**

```typescript
;(state) => {
  if (state.error) return 'error'
  if (state.done) return 'complete'
  if (state.retries > 3) return 'max_retries'
  return 'continue'
}
// Multiple conditions with clear priority
```

### **Complex Router (Extract to Function)**

```typescript
function intelligentRouter(state: MyState): string {
  // Document your routing logic

  // Priority 1: Error handling
  if (state.error) {
    return state.error.recoverable ? 'retry' : 'fail'
  }

  // Priority 2: Completion
  if (state.isComplete) {
    return 'success'
  }

  // Priority 3: Safety limits
  if (state.attempts >= MAX_ATTEMPTS) {
    return 'timeout'
  }

  // Priority 4: Business logic
  if (state.priority === 'high' && state.needsApproval) {
    return 'approval_queue'
  }

  // Default: continue processing
  return 'continue'
}

.addConditionalEdges('processor', intelligentRouter, {
  success: END,
  fail: 'errorHandler',
  retry: 'processor',
  timeout: 'timeoutHandler',
  approval_queue: 'approvalNode',
  continue: 'nextStep',
})
```

---

## 🔁 Loop Mechanics & Pitfalls {#loops}

### **How Loops Work**

```typescript
// Self-loop: Node routes back to itself
.addConditionalEdges('task', (state) => {
  return state.done ? 'exit' : 'loop'
}, {
  exit: END,
  loop: 'task', // ← Goes back to 'task'
})
```

**Execution trace:**

```
Invoke → task(state₀) → returns {done: false}
      → router sees state₁ with done=false
      → returns 'loop'
      → task(state₁) → returns {done: false}
      → router sees state₂ with done=false
      → returns 'loop'
      → task(state₂) → returns {done: true}
      → router sees state₃ with done=true
      → returns 'exit'
      → END
```

### **Loop Patterns**

#### **Pattern 1: Simple Retry**

```typescript
.addConditionalEdges('attempt',
  (state) => state.success ? 'done' : 'retry',
  {
    done: END,
    retry: 'attempt', // Loop back
  }
)
```

#### **Pattern 2: Retry with Limit**

```typescript
.addConditionalEdges('attempt',
  (state) => {
    if (state.success) return 'success'
    if (state.attempts >= MAX) return 'failed'
    return 'retry'
  },
  {
    success: END,
    failed: 'errorHandler',
    retry: 'attempt',
  }
)
```

#### **Pattern 3: Multi-Node Loop**

```typescript
// Loop through multiple nodes
.addEdge('plan', 'execute')
.addEdge('execute', 'evaluate')
.addConditionalEdges('evaluate',
  (state) => state.goalReached ? 'done' : 'continue',
  {
    done: END,
    continue: 'plan', // Back to start of loop
  }
)
```

#### **Pattern 4: Nested Loops**

```typescript
// Outer loop
.addConditionalEdges('outerCheck',
  (state) => state.outerDone ? 'exit' : 'inner',
  {
    exit: END,
    inner: 'innerNode',
  }
)

// Inner loop
.addConditionalEdges('innerNode',
  (state) => {
    if (state.innerComplete) return 'to_outer'
    if (state.innerAttempts > 3) return 'inner_fail'
    return 'inner_loop'
  },
  {
    to_outer: 'outerCheck',
    inner_fail: 'errorHandler',
    inner_loop: 'innerNode',
  }
)
```

### **Common Loop Pitfalls**

#### **Pitfall 1: Infinite Loop**

```typescript
// ❌ BAD: No exit condition!
.addConditionalEdges('node', (state) => 'loop', {
  loop: 'node',
})
// Will run forever!
```

#### **Pitfall 2: State Not Changing**

```typescript
// ❌ BAD: State never changes, so router always returns 'loop'
async function node(state) {
  doSomething() // Doesn't update state!
  return {} // Empty update
}

.addConditionalEdges('node',
  (state) => state.done ? 'exit' : 'loop',
  { exit: END, loop: 'node' }
)
// state.done never changes → infinite loop!
```

✅ **Fix:**

```typescript
async function node(state) {
  const result = doSomething()
  return { done: result.isComplete } // Update state!
}
```

#### **Pitfall 3: Counter Not Incrementing**

```typescript
// ❌ BAD: Counter defined but never incremented
async function node(state) {
  return { result: 'done' } // Where's the counter?
}

.addConditionalEdges('node',
  (state) => state.counter > 5 ? 'exit' : 'loop'
)
// Counter never increases → infinite loop OR immediate exit!
```

✅ **Fix:**

```typescript
async function node(state) {
  const counter = (state.counter || 0) + 1
  return { counter, result: 'done' }
}
```

#### **Pitfall 4: Reducer Not Defined**

```typescript
// ❌ BAD: Counter has wrong reducer
const State = Annotation.Root({
  counter: Annotation<number>({
    reducer: (curr, next) => curr, // ⚠️ Always keeps old value!
  }),
})

// Node returns { counter: 5 }
// But reducer keeps old value (0)
// Loop never exits!
```

✅ **Fix:**

```typescript
const State = Annotation.Root({
  counter: Annotation<number>({
    reducer: (curr, next) => next, // Use new value
  }),
})
```

---

## 🎨 Advanced Patterns {#advanced-patterns}

### **Pattern 1: Priority-Based Routing**

```typescript
function priorityRouter(state: State): string {
  const { priority, status, attempts } = state

  // Critical priority: immediate processing
  if (priority === 'critical') {
    return 'fastTrack'
  }

  // Error state: route to recovery
  if (status === 'error') {
    return attempts < 3 ? 'retry' : 'errorHandler'
  }

  // Normal flow
  return 'standard'
}
```

### **Pattern 2: State Machine Pattern**

```typescript
// Define explicit states
type WorkflowState = 'init' | 'processing' | 'review' | 'complete' | 'failed'

const State = Annotation.Root({
  workflowState: Annotation<WorkflowState>(),
  // ... other fields
})
.addConditionalEdges('transition', (state) => state.workflowState, {
  init: 'startNode',
  processing: 'processNode',
  review: 'reviewNode',
  complete: END,
  failed: 'errorHandler',
})
```

### **Pattern 3: Dynamic Route Calculation**

```typescript
function dynamicRouter(state: State): string {
  // Calculate based on multiple factors
  const score = calculateScore(state)
  const risk = assessRisk(state)

  if (risk > 0.8) return 'highRiskPath'
  if (score > 90) return 'fastPath'
  if (score < 50) return 'reviewPath'
  return 'normalPath'
}
```

### **Pattern 4: Conditional Parallelism (Future Feature)**

```typescript
// Note: True parallel execution requires special LangGraph features
// This shows the conceptual pattern

.addConditionalEdges('dispatcher',
  (state) => {
    // Return array of node names for parallel execution
    if (state.needsBothAnalyses) {
      return 'parallel_ab'
    }
    return 'single'
  },
  {
    parallel_ab: 'parallelNode', // Special node that fans out
    single: 'singleNode',
  }
)
```

---

## 🧠 Mental Models {#mental-models}

### **Model 1: Traffic Intersection**

```
Node = Car approaching intersection
Router = Traffic light
Mapping = Directional signs
State = Car's destination

The traffic light (router) looks at where the car wants to go (state),
then signals which direction (mapping) the car should take.
```

### **Model 2: Decision Tree**

```
      [Node Executes]
            |
    [Router Evaluates State]
            |
       /    |    \
      /     |     \
  NodeA  NodeB  NodeC
```

Each branch is a possible path, router decides which to take.

### **Model 3: Loop as While Loop**

```typescript
// Conditional edge loop:
.addConditionalEdges('task',
  (state) => state.done ? 'exit' : 'continue',
  { exit: END, continue: 'task' }
)

// Is conceptually equivalent to:
while (!state.done) {
  state = await task(state)
}
```

### **Wrong Mental Models**

❌ **"Router modifies state"**

- Routers only READ state, they don't modify it

❌ **"Conditional edges run in parallel"**

- Only ONE branch is taken based on router result

❌ **"Router function is called before node"**

- Router is called AFTER node executes and state is updated

---

## 🏭 Production Considerations {#production}

### **1. Error Handling**

```typescript
function safeRouter(state: State): string {
  try {
    // Your routing logic
    const route = calculateRoute(state)

    // Validate route exists in mapping
    const validRoutes = ['success', 'retry', 'error']
    if (!validRoutes.includes(route)) {
      console.error(`Invalid route: ${route}`)
      return 'error'
    }

    return route
  } catch (err) {
    console.error('Router error:', err)
    return 'error' // Fallback to error handler
  }
}
```

### **2. Logging & Observability**

```typescript
function loggedRouter(state: State): string {
  const route = determineRoute(state)

  // Log routing decisions
  console.log(`[ROUTER] ${state.currentNode} → ${route}`, {
    attempt: state.attempts,
    status: state.status,
    timestamp: new Date().toISOString(),
  })

  return route
}
```

### **3. Testing Routers**

```typescript
// Router functions are pure → easy to test!

describe('Task Router', () => {
  it('routes to success when done', () => {
    const state = { done: true, attempts: 3 }
    expect(taskRouter(state)).toBe('success')
  })

  it('routes to retry when not done and under limit', () => {
    const state = { done: false, attempts: 2 }
    expect(taskRouter(state)).toBe('retry')
  })

  it('routes to failed when max attempts reached', () => {
    const state = { done: false, attempts: 10 }
    expect(taskRouter(state)).toBe('failed')
  })
})
```

### **4. Constants & Configuration**

```typescript
// Define at top of file
const CONFIG = {
  MAX_RETRIES: 3,
  MAX_ITERATIONS: 10,
  TIMEOUT_MS: 30000,
} as const

function configuredRouter(state: State): string {
  if (state.attempts >= CONFIG.MAX_RETRIES) return 'failed'
  if (state.iterations >= CONFIG.MAX_ITERATIONS) return 'timeout'
  return 'continue'
}
```

### **5. Type Safety**

```typescript
// Define valid routes as union type
type ValidRoute = 'success' | 'retry' | 'error' | 'timeout'

function typedRouter(state: State): ValidRoute {
  // TypeScript will ensure you return only valid routes
  if (state.done) return 'success'
  if (state.retries > 3) return 'error'
  return 'retry'
}

// In graph:
.addConditionalEdges('node', typedRouter, {
  success: END,
  retry: 'node',
  error: 'errorHandler',
  timeout: 'timeoutHandler',
  // TypeScript will error if any ValidRoute is missing!
})
```

---

## 📚 Summary: Key Takeaways

### **✅ Must-Know Concepts**

1. **Router functions are pure and synchronous**
2. **Always include default/fallback routes**
3. **Router sees UPDATED state (after node execution)**
4. **Mapping keys must match router return values**
5. **Loops need exit conditions and max iteration limits**
6. **All branches must eventually reach END**
7. **Router functions should be simple and testable**

### **⚠️ Common Mistakes**

1. ❌ Missing default route → Runtime crash
2. ❌ Infinite loops → No exit condition
3. ❌ State not changing → Loop never exits
4. ❌ Complex logic in router → Hard to debug
5. ❌ Mutating state in router → Undefined behavior
6. ❌ Async router → Not supported
7. ❌ Missing END edges → Graph never completes

### **🎯 Best Practices**

1. ✅ Extract complex routers to named functions
2. ✅ Add logging for debugging
3. ✅ Use TypeScript for type safety
4. ✅ Test router functions independently
5. ✅ Document expected routes
6. ✅ Use constants for limits
7. ✅ Handle errors gracefully

---

## 🎓 Further Learning

**Next Topics to Explore:**

- Parallel node execution
- Subgraphs and composition
- Streaming and interrupts
- Persistence and checkpointing
- Error recovery strategies
- Dynamic graph generation

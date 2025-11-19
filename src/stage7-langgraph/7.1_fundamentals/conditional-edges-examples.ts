/**
 * Stage 7 – LangGraph Fundamentals: Conditional Edges Masterclass
 * Micro-project: Comprehensive guide to routing and control flow
 *
 * Objectives:
 * 1. Demonstrate various routing patterns (Basic, Multi-way, Fallback)
 * 2. Implement loops and retry logic with safety limits
 * 3. Show complex state-based routing and early exit strategies
 *
 * Core Concepts Covered:
 * - addConditionalEdges: Dynamic routing based on state
 * - Router Functions: Logic to determine the next node
 * - Cycles: Creating loops for retries or iterative processes
 * - Safety: Implementing max iterations to prevent infinite loops
 */

import { StateGraph, Annotation, END, START } from '@langchain/langgraph'

/**
 * 🎓 COMPLETE GUIDE: Conditional Edges in LangGraph
 *
 * This covers:
 * ✅ Basic routing/branching
 * ✅ Multiple branch destinations
 * ✅ Default/fallback routes
 * ✅ Dynamic route calculation
 * ✅ Loop with retry logic
 * ✅ Loop with max iterations
 * ✅ Early exit conditions
 * ✅ Nested conditionals
 * ✅ Parallel branching patterns
 * ✅ Error handling in routes
 * ✅ Common pitfalls
 */

async function main() {
  // ============================================================================
  // EXAMPLE 1: Basic Routing (2-way branch)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 1: Basic 2-Way Routing')
  console.log('='.repeat(70))

  const BasicRouteState = Annotation.Root({
    input: Annotation<string>(),
    route: Annotation<string>(),
    result: Annotation<string>(),
  })

  async function routerNode1(state: typeof BasicRouteState.State) {
    const route = state.input.toLowerCase().includes('math') ? 'math' : 'text'
    console.log(`  🧭 Router decided: "${state.input}" → ${route}`)
    return { route }
  }

  async function mathNode(state: typeof BasicRouteState.State) {
    console.log('  🧮 Math node processing...')
    return { result: 'Math result: 42' }
  }

  async function textNode(state: typeof BasicRouteState.State) {
    console.log('  📝 Text node processing...')
    return { result: 'Text result: Hello!' }
  }

  const basicGraph = new StateGraph(BasicRouteState)
    .addNode('router', routerNode1)
    .addNode('math', mathNode)
    .addNode('text', textNode)
    .addEdge(START, 'router')
    // Conditional edge: routes based on state.route value
    .addConditionalEdges(
      'router',
      (state) => state.route, // Router function
      {
        math: 'math', // Mapping: route value → node name
        text: 'text',
      },
    )
    .addEdge('math', END)
    .addEdge('text', END)

  const basicApp = basicGraph.compile()

  console.log('\nTest 1: Math input')
  await basicApp.invoke({ input: 'calculate math problem' })

  console.log('\nTest 2: Text input')
  await basicApp.invoke({ input: 'write a story' })

  console.log('\n💡 Key: addConditionalEdges(sourceNode, routerFn, mapping)')

  // ============================================================================
  // EXAMPLE 2: Multi-way Routing (3+ branches)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 2: Multi-Way Routing (4 Routes)')
  console.log('='.repeat(70))

  const MultiRouteState = Annotation.Root({
    query: Annotation<string>(),
    category: Annotation<string>(),
    answer: Annotation<string>(),
  })

  async function classifierNode(state: typeof MultiRouteState.State) {
    const query = state.query.toLowerCase()
    let category = 'general'

    if (query.includes('weather')) category = 'weather'
    else if (query.includes('calculate') || query.includes('math')) category = 'math'
    else if (query.includes('translate')) category = 'translation'

    console.log(`  🎯 Classified: "${state.query}" → ${category}`)
    return { category }
  }

  async function weatherNode(state: typeof MultiRouteState.State) {
    return { answer: '☀️ Weather: Sunny, 72°F' }
  }

  async function mathNode2(state: typeof MultiRouteState.State) {
    return { answer: '🧮 Math: 2+2=4' }
  }

  async function translationNode(state: typeof MultiRouteState.State) {
    return { answer: '🌍 Translation: Hola = Hello' }
  }

  async function generalNode(state: typeof MultiRouteState.State) {
    return { answer: '💬 General: I can help with that!' }
  }

  const multiGraph = new StateGraph(MultiRouteState)
    .addNode('classifier', classifierNode)
    .addNode('weather', weatherNode)
    .addNode('math', mathNode2)
    .addNode('translation', translationNode)
    .addNode('general', generalNode)
    .addEdge(START, 'classifier')
    .addConditionalEdges('classifier', (state) => state.category, {
      weather: 'weather',
      math: 'math',
      translation: 'translation',
      general: 'general',
    })
    .addEdge('weather', END)
    .addEdge('math', END)
    .addEdge('translation', END)
    .addEdge('general', END)

  const multiApp = multiGraph.compile()

  const queries = ['What is the weather?', 'Calculate 5+5', 'Translate hello', 'Tell me a joke']

  for (const q of queries) {
    console.log(`\n📥 Query: ${q}`)
    const result = await multiApp.invoke({ query: q })
    console.log(`📤 Answer: ${result.answer}`)
  }

  // ============================================================================
  // EXAMPLE 3: Default/Fallback Route (CRITICAL!)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 3: Default Route (Handling Unexpected Cases)')
  console.log('='.repeat(70))

  const FallbackState = Annotation.Root({
    input: Annotation<string>(),
    route: Annotation<string>(),
    result: Annotation<string>(),
  })

  async function smartRouter(state: typeof FallbackState.State) {
    const input = state.input.toLowerCase()
    let route = 'unknown' // Default

    if (input.includes('add')) route = 'add'
    else if (input.includes('subtract')) route = 'subtract'

    console.log(`  🧭 Route: ${route}`)
    return { route }
  }

  async function addNode(state: typeof FallbackState.State) {
    return { result: 'Addition result' }
  }

  async function subtractNode(state: typeof FallbackState.State) {
    return { result: 'Subtraction result' }
  }

  async function errorNode(state: typeof FallbackState.State) {
    return { result: '❌ Unknown operation' }
  }

  const fallbackGraph = new StateGraph(FallbackState)
    .addNode('router', smartRouter)
    .addNode('add', addNode)
    .addNode('subtract', subtractNode)
    .addNode('error', errorNode)
    .addEdge(START, 'router')
    .addConditionalEdges('router', (state) => state.route, {
      add: 'add',
      subtract: 'subtract',
      // ⚠️ IMPORTANT: Always handle unexpected routes!
      unknown: 'error', // Default route
    })
    .addEdge('add', END)
    .addEdge('subtract', END)
    .addEdge('error', END)

  const fallbackApp = fallbackGraph.compile()

  console.log('\n✅ Valid input: add')
  await fallbackApp.invoke({ input: 'please add numbers' })

  console.log('\n❌ Invalid input: multiply')
  await fallbackApp.invoke({ input: 'multiply numbers' })

  console.log('\n💡 Always include default route to handle unexpected cases!')

  // ============================================================================
  // EXAMPLE 4: Simple Loop (Retry Logic)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 4: Simple Loop with Retry')
  console.log('='.repeat(70))

  const LoopState = Annotation.Root({
    attempt: Annotation<number>({
      reducer: (curr, next) => next,
    }),
    success: Annotation<boolean>(),
    result: Annotation<string>(),
  })

  async function tryTask(state: typeof LoopState.State) {
    const attempt = (state.attempt || 0) + 1
    console.log(`  🔄 Attempt ${attempt}`)

    // Simulate: succeed on 3rd attempt
    const success = attempt >= 3
    const result = success ? '✅ Task completed!' : '⏳ Still working...'

    return { attempt, success, result }
  }

  const loopGraph = new StateGraph(LoopState)
    .addNode('task', tryTask)
    .addEdge(START, 'task')
    .addConditionalEdges('task', (state) => (state.success ? 'done' : 'retry'), {
      done: END,
      retry: 'task', // Loop back to same node!
    })

  const loopApp = loopGraph.compile()

  console.log('\n🔁 Starting retry loop...')
  const loopResult = await loopApp.invoke({ attempt: 0, success: false })
  console.log('📊 Final result:', loopResult)

  // ============================================================================
  // EXAMPLE 5: Loop with Max Iterations (Safety!)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 5: Loop with Max Iterations (Prevent Infinite Loop)')
  console.log('='.repeat(70))

  const SafeLoopState = Annotation.Root({
    counter: Annotation<number>(),
    goal: Annotation<number>(),
    result: Annotation<string>(),
  })

  async function incrementNode(state: typeof SafeLoopState.State) {
    const counter = (state.counter || 0) + 1
    console.log(`  📊 Counter: ${counter} / ${state.goal}`)
    return { counter }
  }

  // ⚠️ CRITICAL: Always use max iterations to prevent infinite loops!
  const MAX_ITERATIONS = 5

  const safeLoopGraph = new StateGraph(SafeLoopState)
    .addNode('increment', incrementNode)
    .addEdge(START, 'increment')
    .addConditionalEdges(
      'increment',
      (state) => {
        if (state.counter >= state.goal) {
          return 'goal_reached'
        } else if (state.counter >= MAX_ITERATIONS) {
          return 'max_reached'
        } else {
          return 'continue'
        }
      },
      {
        goal_reached: END,
        max_reached: END,
        continue: 'increment',
      },
    )

  const safeLoopApp = safeLoopGraph.compile()

  console.log('\nTest 1: Goal = 3 (should reach goal)')
  await safeLoopApp.invoke({ counter: 0, goal: 3 })

  console.log('\nTest 2: Goal = 10 (should hit max iterations)')
  await safeLoopApp.invoke({ counter: 0, goal: 10 })

  console.log('\n💡 Always include max iteration check to prevent infinite loops!')

  // ============================================================================
  // EXAMPLE 6: Complex Router with State-Based Logic
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 6: State-Based Complex Routing')
  console.log('='.repeat(70))

  const ComplexState = Annotation.Root({
    task: Annotation<string>(),
    priority: Annotation<'low' | 'medium' | 'high'>(),
    retries: Annotation<number>(),
    status: Annotation<string>(),
  })

  async function taskProcessor(state: typeof ComplexState.State) {
    console.log(`  ⚙️ Processing task: ${state.task} (priority: ${state.priority})`)
    const retries = (state.retries || 0) + 1

    // Simulate random success
    const success = Math.random() > 0.5
    return {
      retries,
      status: success ? 'completed' : 'failed',
    }
  }

  async function successNode(state: typeof ComplexState.State) {
    return { status: '✅ Task successful!' }
  }

  async function retryNode(state: typeof ComplexState.State) {
    console.log(`  🔄 Retry ${state.retries}`)
    return {}
  }

  async function failureNode(state: typeof ComplexState.State) {
    return { status: '❌ Task failed after max retries' }
  }

  const complexRouter = (state: typeof ComplexState.State) => {
    console.log(`  🎯 Router: status=${state.status}, retries=${state.retries}`)

    if (state.status === 'completed') {
      return 'success'
    } else if (state.retries >= 3) {
      return 'max_retries'
    } else if (state.priority === 'high') {
      return 'retry_high' // Different retry path for high priority
    } else {
      return 'retry_normal'
    }
  }

  const complexGraph = new StateGraph(ComplexState)
    .addNode('processor', taskProcessor)
    .addNode('success', successNode)
    .addNode('retry', retryNode)
    .addNode('failure', failureNode)
    .addEdge(START, 'processor')
    .addConditionalEdges('processor', complexRouter, {
      success: 'success',
      retry_high: 'retry',
      retry_normal: 'retry',
      max_retries: 'failure',
    })
    .addEdge('retry', 'processor') // Loop back
    .addEdge('success', END)
    .addEdge('failure', END)

  const complexApp = complexGraph.compile()

  console.log('\n🎯 High priority task:')
  await complexApp.invoke({ task: 'Deploy service', priority: 'high', retries: 0 })

  // ============================================================================
  // EXAMPLE 7: Multiple Exit Points (Early Termination)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 7: Multiple Exit Points (Early Termination)')
  console.log('='.repeat(70))

  const ValidationState = Annotation.Root({
    data: Annotation<string>(),
    validated: Annotation<boolean>(),
    processed: Annotation<boolean>(),
    result: Annotation<string>(),
  })

  async function validateNode(state: typeof ValidationState.State) {
    const isValid = state.data && state.data.length > 0
    console.log(`  🔍 Validation: ${isValid ? 'PASS' : 'FAIL'}`)
    return { validated: isValid }
  }

  async function processNode(state: typeof ValidationState.State) {
    console.log('  ⚙️ Processing data...')
    return { processed: true, result: `Processed: ${state.data}` }
  }

  async function errorHandlerNode(state: typeof ValidationState.State) {
    return { result: '❌ Invalid data - cannot process' }
  }

  const validationGraph = new StateGraph(ValidationState)
    .addNode('validate', validateNode)
    .addNode('process', processNode)
    .addNode('error', errorHandlerNode)
    .addEdge(START, 'validate')
    .addConditionalEdges('validate', (state) => (state.validated ? 'valid' : 'invalid'), {
      valid: 'process', // Continue to processing
      invalid: 'error', // Early exit to error handler
    })
    .addEdge('process', END)
    .addEdge('error', END) // Both paths end

  const validationApp = validationGraph.compile()

  console.log('\n✅ Valid data:')
  await validationApp.invoke({ data: 'hello world' })

  console.log('\n❌ Invalid data:')
  await validationApp.invoke({ data: '' })

  console.log('\n💡 Early exit patterns prevent unnecessary processing')

  // ============================================================================
  // EXAMPLE 8: Conditional Edge Pitfalls & Anti-Patterns
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 8: Common Pitfalls & Anti-Patterns')
  console.log('='.repeat(70))

  console.log(`
❌ PITFALL #1: Missing Default Route
-----------------------------------------
.addConditionalEdges('node', (state) => state.route, {
  'routeA': 'nodeA',
  'routeB': 'nodeB',
  // ⚠️ What if state.route = 'routeC'? → RUNTIME ERROR!
})

✅ FIX: Always include a default
.addConditionalEdges('node', (state) => state.route || 'default', {
  'routeA': 'nodeA',
  'routeB': 'nodeB',
  'default': 'errorHandler',
})

❌ PITFALL #2: Infinite Loop (No Exit Condition)
-----------------------------------------
.addConditionalEdges('task', (state) => 'retry', {
  retry: 'task',  // ⚠️ Always loops back!
})

✅ FIX: Include exit condition
.addConditionalEdges('task', (state) => {
  return state.success || state.attempts > 10 ? 'done' : 'retry'
}, {
  done: END,
  retry: 'task',
})

❌ PITFALL #3: Complex Logic in Router Function
-----------------------------------------
.addConditionalEdges('node', (state) => {
  // ⚠️ 50 lines of business logic
  // This is hard to test and debug!
  return calculateComplexRoute(state)
})

✅ FIX: Extract to separate function
function calculateRoute(state) {
  // Testable, documented logic
  if (state.priority === 'high') return 'urgent'
  if (state.retries > 3) return 'failed'
  return 'normal'
}

.addConditionalEdges('node', calculateRoute, {...})

❌ PITFALL #4: Mutating State in Router
-----------------------------------------
.addConditionalEdges('node', (state) => {
  state.visited = true  // ⚠️ Mutation!
  return 'next'
})

✅ FIX: Router should be pure
.addConditionalEdges('node', (state) => {
  // Don't mutate - just read and return route
  return state.visited ? 'skip' : 'process'
})

❌ PITFALL #5: Forgetting to Connect Branches to END
-----------------------------------------
.addConditionalEdges('router', (state) => state.route, {
  'a': 'nodeA',
  'b': 'nodeB',
})
// ⚠️ Missing: .addEdge('nodeA', END) and .addEdge('nodeB', END)

✅ FIX: All branches must reach END
.addEdge('nodeA', END)
.addEdge('nodeB', END)
`)

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('📚 COMPREHENSIVE SUMMARY')
  console.log('='.repeat(70))
  console.log(`
🎯 CONDITIONAL EDGES API:

.addConditionalEdges(
  sourceNode: string,           // Node to branch from
  routerFunction: (state) => string,  // Returns route key
  mapping: { [key: string]: string }  // Maps keys to node names
)

🔀 ROUTING PATTERNS:

1. Simple Branch: A → (B or C)
2. Multi-way: A → (B or C or D or E)
3. Loop: A → B → (back to A or END)
4. Early Exit: A → B → (C or END)
5. Nested: A → B → (C → (D or E) or F)

🛡️ SAFETY CHECKLIST:

✅ Always include default/fallback route
✅ Always add max iteration limit for loops
✅ All branches must eventually reach END
✅ Router function should be pure (no mutations)
✅ Keep router logic simple and testable
✅ Handle all possible route values in mapping

🧠 BEST PRACTICES:

1. Router returns string key matching mapping
2. Use descriptive route names ('success', 'retry', 'error')
3. Extract complex routing logic to separate functions
4. Add logging in router for debugging
5. Test all branches independently
6. Document expected routes in comments

⚠️ COMMON MISTAKES:

❌ Missing default route → Runtime error
❌ Infinite loops → Add max iterations
❌ Complex logic in router → Extract to function
❌ Mutating state in router → Keep it pure
❌ Forgetting END edges → Graph never completes
❌ No logging → Hard to debug routing decisions

🎓 ADVANCED PATTERNS:

• Conditional loops with early exit
• Priority-based routing
• State-dependent branching
• Dynamic route calculation
• Error handling at each branch
• Retry with exponential backoff
• Parallel branching (future examples)
`)

  console.log('\n✨ All examples completed! Review the patterns above.')
}

main().catch(console.error)

import { Annotation, StateGraph, END } from '@langchain/langgraph'

/**
 * 🎓 COMPLETE GUIDE: Understanding Reducers vs Node Functions
 *
 * FIXED VERSION - All bugs corrected and scenarios added
 *
 * This file demonstrates:
 * 1. ✅ Correct reducer signatures (2 parameters!)
 * 2. ✅ When reducers are called vs not called
 * 3. ✅ Partial state updates
 * 4. ✅ Default reducer behavior
 * 5. ✅ Parallel nodes and race conditions
 * 6. ✅ Conditional updates
 * 7. ✅ Common pitfalls and how to avoid them
 */

async function main() {
  // ============================================================================
  // EXAMPLE 1: Simple Node Function - DEFAULT REDUCER BEHAVIOR (FIXED!)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 1: Default Reducer Behavior (FIXED)')
  console.log('='.repeat(70))

  const SimpleState = Annotation.Root({
    message: Annotation<string>({
      // ✅ CORRECT: Reducer receives TWO parameters
      reducer: (current: string, update: string) => {
        console.log(`  🔄 Reducer: current="${current}", update="${update}"`)
        return update // Default behavior: replace with new value
      },
    }),
  })

  async function simpleNode(state: typeof SimpleState.State) {
    console.log('  📥 Node received:', state.message)
    const newMessage = `[Node] Transformed: ${state.message.toUpperCase()}`
    console.log('  📤 Node returns:', newMessage)
    return { message: newMessage }
  }

  const simpleWorkflow = new StateGraph(SimpleState)
    .addNode('transform', simpleNode)
    .addEdge('__start__', 'transform')
    .addEdge('transform', END)

  const simpleApp = simpleWorkflow.compile()
  const simpleResult = await simpleApp.invoke({ message: 'hello world' })
  console.log('  ✅ Final output:', simpleResult)
  console.log('  💡 Note: Reducer is called TWICE - once for input, once for node output')

  // ============================================================================
  // EXAMPLE 1B: Without Explicit Reducer (Default Behavior)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 1B: No Reducer Specified (Uses Default Replace)')
  console.log('='.repeat(70))

  const DefaultState = Annotation.Root({
    message: Annotation<string>(), // No reducer = default replace behavior
  })

  async function defaultNode(state: typeof DefaultState.State) {
    console.log('  📥 Node received:', state.message)
    return { message: `Processed: ${state.message}` }
  }

  const defaultWorkflow = new StateGraph(DefaultState)
    .addNode('process', defaultNode)
    .addEdge('__start__', 'process')
    .addEdge('process', END)

  const defaultApp = defaultWorkflow.compile()
  const defaultResult = await defaultApp.invoke({ message: 'test' })
  console.log('  ✅ Final output:', defaultResult)
  console.log('  💡 Note: Same as Example 1 but without explicit reducer')

  // ============================================================================
  // EXAMPLE 2: Reducer with Transformation (FIXED!)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 2: Reducer Transforms EVERY Update (FIXED)')
  console.log('='.repeat(70))

  const TransformState = Annotation.Root({
    message: Annotation<string>({
      reducer: (current: string, update: string) => {
        console.log(`  🔄 Reducer: "${current}" -> "${update}" -> UPPERCASE`)
        return update.toUpperCase() // Transform EVERY update
      },
    }),
  })

  async function transformNode(state: typeof TransformState.State) {
    console.log('  📥 Node received:', state.message)
    const newMessage = `[Node] Added prefix: ${state.message}`
    console.log('  📤 Node returns:', newMessage)
    return { message: newMessage }
  }

  const transformWorkflow = new StateGraph(TransformState)
    .addNode('transform', transformNode)
    .addEdge('__start__', 'transform')
    .addEdge('transform', END)

  const transformApp = transformWorkflow.compile()
  const transformResult = await transformApp.invoke({ message: 'hello world' })
  console.log('  ✅ Final output:', transformResult)
  console.log('  💡 Correct: Input arrives UPPERCASE, node sees UPPERCASE, output is UPPERCASE')

  // ============================================================================
  // EXAMPLE 3: Multiple Nodes Updating Same Field (WORKING CORRECTLY)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 3: Multiple Sequential Nodes - Reducer Merges')
  console.log('='.repeat(70))

  const MergeState = Annotation.Root({
    log: Annotation<string[]>({
      reducer: (current: string[], update: string[]) => {
        console.log(`  🔄 [log] Reducer: [${current}] + [${update}]`)
        return [...(current || []), ...(update || [])]
      },
    }),
    counter: Annotation<number>({
      reducer: (current: number, update: number) => {
        console.log(`  🔄 [counter] Reducer: ${current} + ${update}`)
        return (current || 0) + (update || 0)
      },
    }),
  })

  async function nodeA(state: typeof MergeState.State) {
    console.log('  📥 Node A received:', state)
    return { log: ['Node A executed'], counter: 1 }
  }

  async function nodeB(state: typeof MergeState.State) {
    console.log('  📥 Node B received:', state)
    return { log: ['Node B executed'], counter: 2 }
  }

  async function nodeC(state: typeof MergeState.State) {
    console.log('  📥 Node C received:', state)
    return { log: ['Node C executed'], counter: 3 }
  }

  const mergeWorkflow = new StateGraph(MergeState)
    .addNode('nodeA', nodeA)
    .addNode('nodeB', nodeB)
    .addNode('nodeC', nodeC)
    .addEdge('__start__', 'nodeA')
    .addEdge('nodeA', 'nodeB')
    .addEdge('nodeB', 'nodeC')
    .addEdge('nodeC', END)

  const mergeApp = mergeWorkflow.compile()
  const mergeResult = await mergeApp.invoke({ log: [], counter: 0 })
  console.log('  ✅ Final output:', mergeResult)
  console.log('  💡 Note: Each node update triggers the reducer')

  // ============================================================================
  // EXAMPLE 4: Practical Message Processing Pipeline (FIXED!)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 4: Message Processing Pipeline (FIXED)')
  console.log('='.repeat(70))

  const MessageState = Annotation.Root({
    originalMessage: Annotation<string>({
      reducer: (current: string, update: string) => {
        console.log(`  🔄 [original] Keep original: "${current}"`)
        return current // Always keep the original
      },
    }),
    processedMessage: Annotation<string>({
      reducer: (current: string, update: string) => {
        console.log(`  🔄 [processed] Replace: "${current}" -> "${update}"`)
        return update // Last update wins
      },
    }),
    processingSteps: Annotation<string[]>({
      reducer: (current: string[], update: string[]) => {
        console.log(`  🔄 [steps] Accumulate: +${update.length} steps`)
        return [...(current || []), ...(update || [])]
      },
    }),
  })

  async function validateNode(state: typeof MessageState.State) {
    console.log('  🔍 [Validate] Input:', state.originalMessage)
    const isValid = state.originalMessage.trim().length > 0
    return {
      processingSteps: [`✅ Validation: ${isValid ? 'PASSED' : 'FAILED'}`],
      // ✅ Initialize processedMessage here!
      processedMessage: state.originalMessage,
    }
  }

  async function sanitizeNode(state: typeof MessageState.State) {
    console.log('  🧹 [Sanitize] Input:', state.processedMessage)
    const sanitized = state.processedMessage.trim().toLowerCase()
    return {
      processedMessage: sanitized,
      processingSteps: [`🧹 Sanitized: "${sanitized}"`],
    }
  }

  async function enrichNode(state: typeof MessageState.State) {
    console.log('  ✨ [Enrich] Input:', state.processedMessage)
    const enriched = `[ENRICHED] ${state.processedMessage} [ENRICHED]`
    return {
      processedMessage: enriched,
      processingSteps: [`✨ Enriched message`],
    }
  }

  const messageWorkflow = new StateGraph(MessageState)
    .addNode('validate', validateNode)
    .addNode('sanitize', sanitizeNode)
    .addNode('enrich', enrichNode)
    .addEdge('__start__', 'validate')
    .addEdge('validate', 'sanitize')
    .addEdge('sanitize', 'enrich')
    .addEdge('enrich', END)

  const messageApp = messageWorkflow.compile()
  const messageResult = await messageApp.invoke({
    originalMessage: '  Hello World  ',
    processedMessage: '',
    processingSteps: [],
  })

  console.log('  ✅ Final output:', JSON.stringify(messageResult, null, 2))

  // ============================================================================
  // NEW EXAMPLE 5: Partial Updates - Reducer NOT Called
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 5: Partial Updates - When Reducers Are NOT Called')
  console.log('='.repeat(70))

  const PartialState = Annotation.Root({
    field1: Annotation<string>({
      reducer: (current: string, update: string) => {
        console.log(`  🔄 [field1] Reducer called: "${current}" -> "${update}"`)
        return update
      },
    }),
    field2: Annotation<number>({
      reducer: (current: number, update: number) => {
        console.log(`  🔄 [field2] Reducer called: ${current} -> ${update}`)
        return update
      },
    }),
  })

  async function partialNode1(state: typeof PartialState.State) {
    console.log('  📥 Node 1: Only updating field1')
    return { field1: 'updated by node1' } // field2 NOT returned
  }

  async function partialNode2(state: typeof PartialState.State) {
    console.log('  📥 Node 2: Only updating field2')
    return { field2: 42 } // field1 NOT returned
  }

  const partialWorkflow = new StateGraph(PartialState)
    .addNode('node1', partialNode1)
    .addNode('node2', partialNode2)
    .addEdge('__start__', 'node1')
    .addEdge('node1', 'node2')
    .addEdge('node2', END)

  const partialApp = partialWorkflow.compile()
  const partialResult = await partialApp.invoke({ field1: 'initial1', field2: 100 })
  console.log('  ✅ Final output:', partialResult)
  console.log('  💡 Key: field2 reducer NOT called by node1, field1 reducer NOT called by node2')

  // ============================================================================
  // NEW EXAMPLE 6: Conditional Updates
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 6: Conditional Updates Based on State')
  console.log('='.repeat(70))

  const ConditionalState = Annotation.Root({
    value: Annotation<number>(),
    history: Annotation<string[]>({
      reducer: (current: string[], update: string[]) => [...(current || []), ...(update || [])],
    }),
  })

  async function conditionalNode(state: typeof ConditionalState.State) {
    console.log(`  📥 Node received value: ${state.value}`)

    if (state.value > 10) {
      console.log('  ✅ Value > 10: Updating both fields')
      return {
        value: state.value * 2,
        history: [`Doubled ${state.value} to ${state.value * 2}`],
      }
    } else {
      console.log('  ⚠️  Value <= 10: Only updating history')
      return {
        // value NOT updated - reducer for value NOT called
        history: [`Value ${state.value} too small, no change`],
      }
    }
  }

  const conditionalWorkflow = new StateGraph(ConditionalState)
    .addNode('process', conditionalNode)
    .addEdge('__start__', 'process')
    .addEdge('process', END)

  const conditionalApp = conditionalWorkflow.compile()

  console.log('\n  Test 1: value = 5 (should NOT update value)')
  const condResult1 = await conditionalApp.invoke({ value: 5, history: [] })
  console.log('  ✅ Result:', condResult1)

  console.log('\n  Test 2: value = 15 (should update value)')
  const condResult2 = await conditionalApp.invoke({ value: 15, history: [] })
  console.log('  ✅ Result:', condResult2)

  // ============================================================================
  // NEW EXAMPLE 7: Object Merging Reducer
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('EXAMPLE 7: Deep Object Merging with Reducer')
  console.log('='.repeat(70))

  interface UserProfile {
    name?: string
    age?: number
    email?: string
    preferences?: {
      theme?: string
      notifications?: boolean
    }
  }

  const ObjectState = Annotation.Root({
    profile: Annotation<UserProfile>({
      reducer: (current: UserProfile, update: UserProfile) => {
        console.log('  🔄 Merging profiles...')
        console.log('    Current:', JSON.stringify(current))
        console.log('    Update:', JSON.stringify(update))
        // Deep merge
        const merged = {
          ...current,
          ...update,
          preferences: {
            ...(current?.preferences || {}),
            ...(update?.preferences || {}),
          },
        }
        console.log('    Merged:', JSON.stringify(merged))
        return merged
      },
    }),
  })

  async function updateNameNode(state: typeof ObjectState.State) {
    return { profile: { name: 'Alice' } }
  }

  async function updatePrefsNode(state: typeof ObjectState.State) {
    return { profile: { preferences: { theme: 'dark' } } }
  }

  async function updateEmailNode(state: typeof ObjectState.State) {
    return { profile: { email: 'alice@example.com' } }
  }

  const objectWorkflow = new StateGraph(ObjectState)
    .addNode('setName', updateNameNode)
    .addNode('setPrefs', updatePrefsNode)
    .addNode('setEmail', updateEmailNode)
    .addEdge('__start__', 'setName')
    .addEdge('setName', 'setPrefs')
    .addEdge('setPrefs', 'setEmail')
    .addEdge('setEmail', END)

  const objectApp = objectWorkflow.compile()
  const objectResult = await objectApp.invoke({ profile: { age: 30 } })
  console.log('  ✅ Final profile:', JSON.stringify(objectResult, null, 2))
  console.log('  💡 Note: Each node adds fields, reducer merges them together')

  // ============================================================================
  // NEW EXAMPLE 8: Common Anti-Pattern (Wrong Reducer Usage)
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log("EXAMPLE 8: Anti-Pattern - Business Logic in Reducer (DON'T DO THIS!)")
  console.log('='.repeat(70))

  const AntiPatternState = Annotation.Root({
    count: Annotation<number>({
      reducer: (current: number, update: number) => {
        // ❌ ANTI-PATTERN: Don't put business logic in reducer!
        console.log('  ❌ BAD: Business logic in reducer')
        if (update > 100) {
          console.log('  ❌ Capping value at 100 in reducer (should be in node!)')
          return 100
        }
        return update
      },
    }),
  })

  async function antiPatternNode(state: typeof AntiPatternState.State) {
    // ✅ CORRECT: Business logic should be HERE
    const newValue = state.count + 50
    console.log(`  ✅ GOOD: Business logic in node: ${state.count} + 50 = ${newValue}`)
    return { count: newValue }
  }

  const antiPatternWorkflow = new StateGraph(AntiPatternState)
    .addNode('increment', antiPatternNode)
    .addEdge('__start__', 'increment')
    .addEdge('increment', END)

  const antiPatternApp = antiPatternWorkflow.compile()
  const antiPatternResult = await antiPatternApp.invoke({ count: 80 })
  console.log('  ✅ Result:', antiPatternResult)
  console.log('  💡 Better approach: Validate in node, use reducer ONLY for merging')

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('📚 COMPLETE SUMMARY: Reducers vs Nodes')
  console.log('='.repeat(70))
  console.log(`
🔧 REDUCER:
   ✅ Signature: (currentState, incomingUpdate) => newState
   ✅ Called: When a node returns that field (or on initial input)
   ❌ NOT Called: When a node doesn't return that field
   ✅ Purpose: Merge/combine updates (arrays, objects, accumulation)
   ❌ Anti-pattern: Business logic, validation, complex transformations
   
   Common patterns:
   • Replace: (_, update) => update (default behavior)
   • Append: (curr, upd) => [...curr, ...upd]
   • Sum: (curr, upd) => curr + upd
   • Merge: (curr, upd) => ({...curr, ...upd})
   • Keep first: (curr, _) => curr

⚙️  NODE FUNCTION:
   ✅ Purpose: Business logic, decisions, transformations
   ✅ Can return: Partial state (only fields you want to update)
   ✅ Receives: CURRENT state (after all previous reducers)
   
   Responsibilities:
   • LLM/API calls
   • Data validation
   • Complex transformations
   • Conditional logic
   • State-based decisions

🎯 MENTAL MODEL:
   1. Node executes -> returns partial update
   2. For EACH returned field -> call its reducer
   3. Reducer merges update into current state
   4. Next node receives merged state
   
   Flow: State -> Node -> Update -> Reducer -> New State -> Next Node

⚠️  COMMON MISTAKES:
   ❌ Single-parameter reducer: (x) => x
   ✅ Two-parameter reducer: (current, update) => ...
   
   ❌ Business logic in reducer
   ✅ Business logic in node
   
   ❌ Expecting reducer to be called when node doesn't return field
   ✅ Understand partial updates
   
   ❌ Modifying state in-place
   ✅ Always return new objects/arrays
`)
}

main()

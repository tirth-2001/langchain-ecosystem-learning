/**
 * Stage 7 – LangGraph Fundamentals: Hello World
 * Micro-project: Basic StateGraph structure
 *
 * Objectives:
 * 1. Define a simple StateAnnotation
 * 2. Create a basic node that modifies state
 * 3. Build and compile a linear graph
 * 4. Execute the graph with initial state
 *
 * Core Concepts Covered:
 * - StateGraph: The core container for the workflow
 * - Annotation: Defining the schema of the graph state
 * - Nodes: Functions that perform work and return state updates
 * - Edges: Defining the flow of execution (START -> Node -> END)
 */

import { Annotation, StateGraph, END } from '@langchain/langgraph'

// 1) Define the state structure
const StateAnnotation = Annotation.Root({
  message: Annotation<string>({
    reducer: (x: string) => x.toUpperCase(),
  }),
})

// 2) Node: the operation to run
async function helloNode(state: typeof StateAnnotation.State) {
  return {
    message: `Hello from LangGraph! Input was: ${state.message}`,
  }
}

// 3) Build the graph
const workflow = new StateGraph(StateAnnotation)
  .addNode('hello', helloNode)
  .addEdge('__start__', 'hello')
  .addEdge('hello', END)

// 4) Compile the graph
const app = workflow.compile()

async function main() {
  const result = await app.invoke({
    message: 'This is my first LangGraph flow',
  })

  console.log('✅ Output:', result)
}

main()

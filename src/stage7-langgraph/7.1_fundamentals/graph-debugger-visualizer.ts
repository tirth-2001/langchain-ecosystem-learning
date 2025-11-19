/**
 * Stage 7 – LangGraph Fundamentals: Debugging & Visualization
 * Micro-project: Graph introspection and visualization tools
 *
 * Objectives:
 * 1. Implement a debugger hook to trace graph execution events
 * 2. Visualize the graph structure using Mermaid.js
 * 3. Capture and log state snapshots at each step
 *
 * Core Concepts Covered:
 * - streamEvents: Real-time execution tracing
 * - drawMermaid: Generating visual representations of the graph
 * - Debugging: Logging state transitions and node outputs
 */

import { StateGraph, Annotation, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { writeFileSync } from 'fs'
import { join } from 'path'
import 'dotenv/config'

// Get current file's directory (works in CommonJS build)
const CURRENT_DIR = __dirname

/**
 * 1️⃣ Define State
 */
const StateAnnotation = Annotation.Root({
  input: Annotation<string>({ reducer: (_current: string, update: string) => update }),
  summary: Annotation<string>({ reducer: (_current: string, update: string) => update }),
})

/**
 * 2️⃣ Define Nodes
 */
const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.3 })

const summarizePrompt = ChatPromptTemplate.fromTemplate(`
Summarize the following user text in one concise sentence:
{text}
`)

const summarizeChain = RunnableSequence.from([summarizePrompt, model, (out) => out.content.trim()])

async function summarizeNode(state: typeof StateAnnotation.State) {
  const summary = await summarizeChain.invoke({ text: state.input })
  return { summary }
}

async function logNode(state: typeof StateAnnotation.State) {
  console.log('📘 Final summary:', state.summary)
  return state
}

/**
 * 3️⃣ Build Graph
 */
const workflow = new StateGraph(StateAnnotation)
  .addNode('summarizer', summarizeNode)
  .addNode('logger', logNode)
  .addEdge('__start__', 'summarizer')
  .addEdge('summarizer', 'logger')
  .addEdge('logger', END)

const app = workflow.compile()

/**
 * 4️⃣ Debugger Hook - Console Debugger + JSON Event Collector
 */
async function runWithDebugger(input: string) {
  const logFile = join(CURRENT_DIR, 'graph-debug.json')
  const debugData: any[] = []

  console.log('🚀 Executing graph...\n')

  // Use streamEvents to capture execution events
  const stream = await app.streamEvents(
    { input },
    {
      version: 'v2',
    },
  )

  for await (const event of stream) {
    const { event: eventType, name, data } = event

    // 🧾 A: Console Debugger - Log events in real-time
    if (eventType && name) {
      console.log(`🧩 ${eventType} @ ${name}`)
    }

    // Log state snapshots for different event types
    if (eventType === 'on_chain_start' || eventType === 'on_chain_end') {
      if (data?.input) {
        console.log('🔄 State Snapshot (input):', JSON.stringify(data.input, null, 2))
      }
      if (data?.output) {
        console.log('🔄 State Snapshot (output):', JSON.stringify(data.output, null, 2))
      }
    }

    // Handle LangGraph-specific state updates
    if (eventType === 'on_chain_stream' && data?.chunk) {
      // Stream chunks for progressive output
      const chunk = data.chunk
      if (typeof chunk === 'object' && 'summary' in chunk) {
        console.log('📊 State Update:', JSON.stringify(chunk, null, 2))
      }
    }

    // 🔍 B: JSON Event Collector - Record structured execution logs
    debugData.push({
      time: new Date().toISOString(),
      event: eventType,
      node: name,
      data: {
        input: data?.input,
        output: data?.output,
        chunk: data?.chunk,
      },
    })
  }

  // Write JSON debug log
  writeFileSync(logFile, JSON.stringify(debugData, null, 2))
  console.log(`\n🪶 Debug log written to ${logFile}`)

  return debugData
}

/**
 * 5️⃣ Graph Visualization - Export Mermaid format and PNG
 */
async function exportGraphVisualization() {
  try {
    // Get the drawable graph representation
    const drawableGraph = await app.getGraphAsync()

    // Generate Mermaid diagram
    const mermaidContent = drawableGraph.drawMermaid()
    const mermaidFile = join(CURRENT_DIR, 'workflow.mmd')
    writeFileSync(mermaidFile, mermaidContent)
    console.log('🧭 Graph structure exported to workflow.mmd')

    // Generate PNG visualization
    const pngBlob = await drawableGraph.drawMermaidPng()
    const pngFile = join(CURRENT_DIR, 'workflow.png')
    // Convert Blob to Buffer for file writing
    const pngBuffer = Buffer.from(await pngBlob.arrayBuffer())
    writeFileSync(pngFile, pngBuffer)
    console.log('🖼️  Graph visualization exported to workflow.png')

    console.log('\n📊 Graph Structure:')
    console.log('[__start__] → [summarizer] → [logger] → [END]')
    console.log('\n💡 Files generated:')
    console.log(`   - ${mermaidFile}`)
    console.log(`   - ${pngFile}`)

    return { mermaidFile, pngFile }
  } catch (error) {
    console.error('❌ Error exporting graph:', error)
    throw error
  }
}

/**
 * 6️⃣ Main Execution
 */
async function main() {
  const testInput = 'LangGraph enables structured reasoning for AI agents.'

  console.log('='.repeat(60))
  console.log('🕵️‍♂️ Graph Debugger & Visualization Demo')
  console.log('='.repeat(60))
  console.log(`\n📝 Input: "${testInput}"\n`)

  // Run with debugger (Console + JSON output)
  await runWithDebugger(testInput)

  console.log('\n' + '='.repeat(60))

  // Export graph visualization (DOT format)
  await exportGraphVisualization()

  console.log('\n' + '='.repeat(60))
  console.log('✅ Debugging and visualization complete!')
  console.log('='.repeat(60))
}

main().catch(console.error)

/**
 * Stage 4 – Tools: Travel Planner Coordination Demo
 * Micro-project: Complete travel planning workflow with tool orchestration
 *
 * Objectives:
 * 1. Demonstrate complex tool coordination and orchestration
 * 2. Show multi-step planning and execution workflow
 * 3. Implement session management and result aggregation
 *
 * Core Concepts Covered:
 * - Tool orchestration and coordination
 * - Multi-step planning and execution
 * - Session management and state persistence
 * - Complex workflow with multiple specialized tools
 */

// index.ts
import 'dotenv/config'
import { runTravelPlanner } from './orchestrator/travelOrchestrator'

async function main() {
  const sessionId = 'demo-session-1'
  const userInput =
    'Plan a 2-day trip to Kyoto. Include main attractions and check weather for the dates 2025-11-10 to 2025-11-12. Provide a 2-day itinerary.'

  console.log('=== Travel Planner Demo ===')
  try {
    const out = await runTravelPlanner(sessionId, userInput)
    console.log('\n--- Plan (validated) ---\n', JSON.stringify(out.plan, null, 2))
    console.log('\n--- Executed Order ---\n', out.executedOrder)
    console.log('\n--- Tool Results ---\n', JSON.stringify(out.toolResults, null, 2))
    console.log('\n--- Final Itinerary ---\n', JSON.stringify(out.itinerary, null, 2))
  } catch (err) {
    console.error('Planner error:', err)
  }
}

main()

// test-fixes.ts
import 'dotenv/config'
import { runTravelPlanner } from './orchestrator/travelOrchestrator'
import { validateToolRegistry } from './utils/toolRegistry'
import { generatePlannerPrompt } from './utils/dynamicPromptGenerator'

async function testFixes() {
  console.log('=== Testing Travel Planner Fixes ===\n')

  // Test 1: Validate tool registry
  console.log('1. Validating tool registry...')
  const registryValidation = validateToolRegistry()
  console.log('Registry valid:', registryValidation.isValid)
  if (!registryValidation.isValid) {
    console.log('Registry errors:', registryValidation.errors)
    return
  }
  console.log('✅ Tool registry validation passed\n')

  // Test 2: Generate and validate prompt
  console.log('2. Testing prompt generation...')
  try {
    const prompt = generatePlannerPrompt()
    console.log('✅ Prompt generated successfully')

    // Test formatting with dummy data
    const formatted = await prompt.format({ input: 'test input' })
    console.log('✅ Prompt formatting works')
  } catch (error) {
    console.log('❌ Prompt generation failed:', error)
    return
  }
  console.log()

  // Test 3: Run travel planner with a simple request
  console.log('3. Testing travel planner execution...')
  try {
    const sessionId = 'test-session-' + Date.now()
    const userInput = 'Plan a 2-day trip to Tokyo. Include attractions and weather.'

    console.log('User input:', userInput)
    console.log('Running planner...')

    const result = await runTravelPlanner(sessionId, userInput)

    console.log('\n--- Results ---')
    console.log('Plan generated:', !!result.plan)
    console.log('Steps count:', result.plan.steps.length)
    console.log('Executed order:', result.executedOrder)

    // Check for errors
    const hasErrors = Object.values(result.toolResults).some((res: any) => res && res.error)
    console.log('Has execution errors:', hasErrors)

    if (hasErrors) {
      console.log('\n--- Tool Errors ---')
      Object.entries(result.toolResults).forEach(([toolId, res]: [string, any]) => {
        if (res && res.error) {
          console.log(`${toolId}: ${res.error}`)
        }
      })
    }

    // Check final itinerary
    if (result.itinerary && result.itinerary.error) {
      console.log('\n--- Final Itinerary Error ---')
      console.log(result.itinerary.error)
    } else if (result.itinerary && !result.itinerary.error) {
      console.log('\n--- Final Itinerary Success ---')
      console.log('Itinerary generated successfully')
    }

    console.log('\n✅ Travel planner execution completed')
  } catch (error) {
    console.log('❌ Travel planner execution failed:', error)
  }
}

// Run the test
testFixes().catch(console.error)

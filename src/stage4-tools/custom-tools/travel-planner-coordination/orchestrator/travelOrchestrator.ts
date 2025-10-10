/**
 * Stage 4 – Tools: Travel Orchestrator
 * Micro-project: Advanced tool orchestration with planning and execution
 *
 * Objectives:
 * 1. Implement sophisticated tool orchestration with planning
 * 2. Demonstrate parallel execution and dependency resolution
 * 3. Show session management and result aggregation
 *
 * Core Concepts Covered:
 * - Advanced tool orchestration patterns
 * - Planning and execution separation
 * - Parallel tool execution with dependency resolution
 * - Session management and state persistence
 */

// orchestrator/travelOrchestrator.ts
import { ChatOpenAI } from '@langchain/openai'
import { plannerPrompt } from '../prompts/plannerPrompt'
import { PlanSchema, PlanStep, Plan } from '../utils/zodSchemas'
import { sessionStore } from '../utils/sessionStore'
import { retryWithBackoff } from '../utils/retry'

import { TOOL_REGISTRY } from '../utils/toolRegistry'

/**
 * Travel Orchestrator
 *
 * - Calls planner LLM to get typed plan (JSON)
 * - Validates plan (zod)
 * - Executes steps with parallelization & dependency resolution
 * - Validates tool args against tool schema before calling
 * - Uses in-memory sessionStore to persist minimal state
 */

// Planner LLM (stronger model recommended)
const plannerLLM = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
})

function safeParseJSON(s: unknown) {
  try {
    return typeof s === 'string' ? JSON.parse(s) : s
  } catch {
    return s
  }
}

export async function runTravelPlanner(sessionId: string, userInput: string) {
  // load session context (stateless: load -> mutate -> save)
  const sessionBefore = sessionStore.get(sessionId) ?? { context: {}, createdAt: Date.now(), updatedAt: Date.now() }

  // 1) Planner prompt -> LLM
  const promptValue = await plannerPrompt.format({ input: userInput })
  const plannerResp = await plannerLLM.invoke(promptValue)
  const plannerText =
    // modern responses may have .generations... fallback to .text
    (plannerResp as any)?.generations?.[0]?.[0]?.text ?? (plannerResp as any)?.text ?? String(plannerResp)

  // 2) Parse + validate plan
  let plan: Plan
  try {
    const parsed = JSON.parse(plannerText)
    plan = PlanSchema.parse(parsed)
  } catch (err) {
    // Provide more detailed error information
    let errorMessage = 'Planner output invalid JSON / schema: '
    if (err instanceof Error) {
      errorMessage += err.message
    } else {
      errorMessage += String(err)
    }

    // Add the raw planner text for debugging
    errorMessage += '\n\nRaw planner output:\n' + plannerText

    throw new Error(errorMessage)
  }

  // 3) Validate plan structure before execution
  const validationErrors: string[] = []

  // Check for duplicate step IDs
  const stepIds = plan.steps.map((s) => s.id)
  const uniqueStepIds = new Set(stepIds)
  if (stepIds.length !== uniqueStepIds.size) {
    validationErrors.push('Duplicate step IDs found')
  }

  // Check for missing step IDs
  const missingIds = plan.steps.filter((s) => !s.id || s.id.trim() === '')
  if (missingIds.length > 0) {
    validationErrors.push(`Steps with missing IDs found: ${missingIds.length} steps`)
  }

  // Check for invalid tool names
  const invalidTools = plan.steps.filter((s) => !TOOL_REGISTRY[s.tool])
  if (invalidTools.length > 0) {
    validationErrors.push(`Invalid tool names found: ${invalidTools.map((s) => s.tool).join(', ')}`)
  }

  if (validationErrors.length > 0) {
    throw new Error('Plan validation failed: ' + validationErrors.join(', '))
  }

  // 4) Execution: dependency resolution + parallel execution
  const stepsById = new Map(plan.steps.map((s) => [s.id, s]))
  const pending = new Map(plan.steps.map((s) => [s.id, s]))
  const results = new Map<string, any>()
  const executedOrder: string[] = []

  const maxIterations = plan.steps.length * 10
  let iterations = 0

  async function executeStep(step: PlanStep) {
    const tool = TOOL_REGISTRY[step.tool]
    if (!tool) throw new Error(`Unknown tool "${step.tool}"`)

    // Validate args against tool.schema if present (best-effort)
    if ((tool as any).schema) {
      try {
        ;(tool as any).schema.parse(step.args)
      } catch (e) {
        throw new Error(`Arg validation failed for tool ${step.tool}: ${(e as Error).message}`)
      }
    }

    // Execute with retries & timeout
    const raw = await retryWithBackoff(() => (tool as any).call(step.args), 3, 300, 10_000)
    const parsed = safeParseJSON(raw)
    return parsed
  }

  while (pending.size > 0 && iterations++ < maxIterations) {
    // find ready steps
    const ready: PlanStep[] = []
    for (const step of pending.values()) {
      const deps = step.dependsOn ?? []
      const ok = deps.every((d) => results.has(d))
      if (ok) ready.push(step)
    }

    if (ready.length === 0) {
      throw new Error('No ready steps found — circular or unsatisfied dependencies')
    }

    // Execute ready steps in parallel
    const execs = ready.map((s) =>
      executeStep(s)
        .then((r) => ({ id: s.id, ok: true as const, result: r }))
        .catch((err) => ({ id: s.id, ok: false as const, error: String(err) })),
    )

    const settled = await Promise.all(execs)

    for (const item of settled) {
      executedOrder.push(item.id)
      if (!item.ok) {
        results.set(item.id, { error: item.error })
      } else {
        results.set(item.id, item.result)
      }
      pending.delete(item.id)
    }
  }

  if (pending.size > 0) throw new Error('Execution stopped before completing all steps')

  // 5) Check for execution errors first
  const hasErrors = Array.from(results.values()).some((result) => result && result.error)

  let finalItinerary: any = null

  if (!hasErrors) {
    // Only generate final itinerary if no tools failed
    for (const step of plan.steps) {
      if (step.tool === 'ItineraryFormatter' && results.has(step.id)) {
        const result = results.get(step.id)
        if (result && !result.error) {
          finalItinerary = result
          break
        }
      }
    }

    // If not provided, collate and call ItineraryFormatter
    if (!finalItinerary) {
      const collated: any = { city: plan.city ?? null, attractions: [], weather: '', hotels: [] }
      for (const [id, res] of results.entries()) {
        try {
          // Best-effort detection
          if (res && res.attractions) collated.attractions.push(...res.attractions)
          if (res && res.forecast && !collated.weather) collated.weather = res.forecast
          if (res && res.hotels && collated.hotels.length === 0) collated.hotels = res.hotels
        } catch {
          // ignore parsing issues
        }
      }

      // call formatter
      try {
        const formatterTool = TOOL_REGISTRY['ItineraryFormatter']
        if (formatterTool) {
          const raw = await retryWithBackoff(
            () =>
              (formatterTool as any).call({
                city: collated.city,
                attractions: collated.attractions,
                weather: collated.weather,
                hotels: collated.hotels,
                totalDays: 2,
              }),
            2,
            300,
            8000,
          )
          finalItinerary = safeParseJSON(raw)
        } else {
          finalItinerary = { error: 'ItineraryFormatter tool not found' }
        }
      } catch (err) {
        finalItinerary = { error: 'Failed to format itinerary: ' + String(err) }
      }
    }
  } else {
    // If there are errors, don't generate final itinerary
    finalItinerary = {
      error: 'Cannot generate itinerary due to tool execution errors. Please check the tool results for details.',
      hasErrors: true,
    }
  }

  // 6) Save a minimal snapshot in session store
  sessionStore.set(sessionId, { context: { lastPlan: plan, executedOrder }, updatedAt: Date.now() })

  return {
    plan,
    executedOrder,
    toolResults: Object.fromEntries(Array.from(results.entries())),
    itinerary: finalItinerary,
    sessionBefore,
  }
}

// prompts/plannerPrompt.ts
import { generatePlannerPrompt } from '../utils/dynamicPromptGenerator'

/**
 * Planner prompt:
 * Dynamically generated based on the tool registry.
 * This eliminates hardcoded tool names and makes the system maintainable.
 *
 * The orchestrator will validate with zod and reject invalid outputs.
 */

// Generate the prompt dynamically from the tool registry
export const plannerPrompt = generatePlannerPrompt()

/**
 * Stage 4 – Tools: Dynamic Planner Prompt
 * Micro-project: Dynamic prompt generation based on tool registry
 *
 * Objectives:
 * 1. Implement dynamic prompt generation from tool registry
 * 2. Demonstrate maintainable prompt engineering patterns
 * 3. Show elimination of hardcoded tool references
 *
 * Core Concepts Covered:
 * - Dynamic prompt generation
 * - Tool registry integration
 * - Maintainable prompt engineering
 * - Eliminating hardcoded references
 */

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

/**
 * Stage 4 – Tools: Zod Schemas for Travel Planner
 * Micro-project: Type-safe schema definitions for complex workflows
 *
 * Objectives:
 * 1. Define comprehensive Zod schemas for travel planning workflows
 * 2. Demonstrate type-safe data validation and parsing
 * 3. Show schema composition and complex data structures
 *
 * Core Concepts Covered:
 * - Zod schema definition and validation
 * - Type-safe data structures
 * - Schema composition and inheritance
 * - Complex workflow data modeling
 */

// utils/zodSchemas.ts
import { z } from 'zod'

export const PlanStepSchema = z.object({
  id: z.string(),
  tool: z.string(),
  args: z.record(z.string(), z.any()),
  dependsOn: z.array(z.string()).optional(),
  parallelGroup: z.string().optional(),
})

export const PlanSchema = z.object({
  city: z.string().optional(),
  steps: z.array(PlanStepSchema),
})

export type PlanStep = z.infer<typeof PlanStepSchema>
export type Plan = z.infer<typeof PlanSchema>

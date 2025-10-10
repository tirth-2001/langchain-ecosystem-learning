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

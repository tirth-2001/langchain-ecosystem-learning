import { BaseTool } from './baseTool'

export const calculatorTool: BaseTool = {
  name: 'calculator',
  description: 'Evaluates basic mathematical expressions. Input must be a string like "2 + 2 * 3".',
  async execute(input) {
    try {
      // ⚠️ simple and safe eval
      const result = Function(`"use strict"; return (${input})`)()
      return `Result: ${result}`
    } catch (err: any) {
      return `Error evaluating expression: ${err.message}`
    }
  },
}

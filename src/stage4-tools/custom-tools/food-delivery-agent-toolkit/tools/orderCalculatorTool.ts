/**
 * Stage 4 – Tools: Order Calculator Tool
 * Micro-project: Custom tool for calculating order totals and delivery estimates
 *
 * Objectives:
 * 1. Implement order calculation with tax and delivery estimates
 * 2. Demonstrate context-dependent calculations
 * 3. Show proper error handling for missing context
 *
 * Core Concepts Covered:
 * - Custom `Tool` class implementation
 * - Context-dependent calculations
 * - Error handling for missing context
 * - Mock pricing and delivery estimation
 */

import { Tool } from '@langchain/core/tools'
import { contextStore } from '../utils/contextStore'

export class OrderCalculatorTool extends Tool {
  name = 'order_calculator_tool'
  description = 'Calculates total price, tax, and delivery ETA for selected dishes'

  async _call(input: string): Promise<string> {
    try {
      const { restaurant, menu } = contextStore.get()
      if (!restaurant || !menu) throw new Error('Missing context: fetch restaurant and menu first')

      const requestedItems = input.split(',').map((i) => i.trim())
      const prices = requestedItems.map(() => Math.floor(Math.random() * 400) + 100)
      const total = prices.reduce((a, b) => a + b, 0)
      const tax = Math.round(total * 0.05)
      const delivery = 40
      const eta = `${Math.floor(Math.random() * 20) + 15} mins`

      const order = { restaurant, items: requestedItems, total, tax, delivery, eta }
      contextStore.set({ order })

      return `Order summary for ${restaurant}:\nItems: ${requestedItems.join(', ')}\nTotal: ₹${
        total + tax + delivery
      }\nETA: ${eta}`
    } catch (err: any) {
      return `Error calculating order: ${err.message}`
    }
  }
}

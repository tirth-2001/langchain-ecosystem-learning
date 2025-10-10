/**
 * Stage 4 – Tools: Context Store Utility
 * Micro-project: Simple context management for food delivery workflow
 *
 * Objectives:
 * 1. Implement a simple context store for tool coordination
 * 2. Demonstrate state management across multiple tools
 * 3. Show context sharing patterns in tool workflows
 *
 * Core Concepts Covered:
 * - Context management for tool coordination
 * - State sharing across multiple tools
 * - Simple in-memory store implementation
 */

// utils/contextStore.ts
interface Context {
  restaurant?: string
  menu?: string[]
  order?: any
}

let store: Context = {}

export const contextStore = {
  get: () => store,
  set: (updates: Partial<Context>) => {
    store = { ...store, ...updates }
  },
  clear: () => {
    store = {}
  },
}

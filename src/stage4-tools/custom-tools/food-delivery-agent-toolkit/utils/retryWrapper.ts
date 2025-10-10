/**
 * Stage 4 – Tools: Retry Wrapper Utility
 * Micro-project: Retry mechanism for unreliable API calls
 *
 * Objectives:
 * 1. Implement exponential backoff retry mechanism
 * 2. Demonstrate error handling for API failures
 * 3. Show reliability patterns for external service integration
 *
 * Core Concepts Covered:
 * - Retry mechanism with exponential backoff
 * - Error handling for API failures
 * - Reliability patterns for external services
 */

// utils/retryWrapper.ts
export async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise((res) => setTimeout(res, delay * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}

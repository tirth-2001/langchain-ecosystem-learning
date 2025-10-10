/**
 * Stage 4 – Tools: Retry Utility with Backoff
 * Micro-project: Advanced retry mechanism with exponential backoff and timeouts
 *
 * Objectives:
 * 1. Implement sophisticated retry mechanism with exponential backoff
 * 2. Demonstrate timeout handling for long-running operations
 * 3. Show error handling and retry strategies for external services
 *
 * Core Concepts Covered:
 * - Exponential backoff retry mechanism
 * - Timeout handling for async operations
 * - Error handling and retry strategies
 * - Advanced reliability patterns
 */

// utils/retry.ts
/**
 * retryWithBackoff: run async function with retries and per-attempt timeout.
 *
 * - fn: async function to run
 * - attempts: number of attempts (default 3)
 * - initialDelayMs: base backoff (default 300ms)
 * - timeoutMs: per-attempt timeout in ms (default 10s)
 */

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts = 3,
  initialDelayMs = 300,
  timeoutMs = 10000,
): Promise<T> {
  let attempt = 0
  let delay = initialDelayMs
  let lastError: unknown = null

  while (attempt < attempts) {
    try {
      attempt++
      return await withTimeout(fn(), timeoutMs)
    } catch (err) {
      lastError = err
      if (attempt >= attempts) break
      // exponential backoff with jitter
      const jitter = Math.floor(Math.random() * Math.min(1000, delay))
      await new Promise((res) => setTimeout(res, delay + jitter))
      delay *= 2
    }
  }
  throw lastError
}

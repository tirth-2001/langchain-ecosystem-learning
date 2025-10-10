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

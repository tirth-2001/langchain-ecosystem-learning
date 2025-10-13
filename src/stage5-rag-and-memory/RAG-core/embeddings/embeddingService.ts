import fs from 'fs'

import { OpenAIProvider } from './providers/openaiEmbeddings'
import { CohereProvider } from './providers/cohereEmbeddings'
import { EmbeddingRecord, EmbeddingProviderName, EmbeddingServiceOptions, DocumentWithId } from './types'
import { sha1, getCacheKey } from './utils/hash'

const DEFAULT_BATCH_SIZE = 64
const DEFAULT_CACHE_SIZE = 50000

// Simple in-memory cache (swap for Redis/file if needed)
let cache: any

export class EmbeddingService {
  private provider: any
  private batchSize: number
  private cacheEnabled: boolean
  private cacheFile?: string
  private pRetry: any

  constructor(
    providerName: EmbeddingProviderName,
    opts: EmbeddingServiceOptions & { cacheEnabled?: boolean; cacheFile?: string } = {},
  ) {
    this.batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE
    this.cacheEnabled = opts.cacheEnabled ?? true
    this.cacheFile = opts.cacheFile

    // Initialize provider
    switch (providerName) {
      case 'openai':
        this.provider = new OpenAIProvider(opts)
        break
      case 'cohere':
        this.provider = new CohereProvider(opts)
        break
      default:
        throw new Error(`Unknown provider: ${providerName}`)
    }

    // Load cache from file if specified
    if (this.cacheFile && fs.existsSync(this.cacheFile)) {
      this.loadCacheFromFile()
    }
  }

  /**
   * Initialize ES modules dynamically
   */
  private async initializeModules(): Promise<void> {
    if (!cache) {
      const LRU = (await import('lru-cache')).LRUCache
      cache = new LRU<string, number[]>({ max: DEFAULT_CACHE_SIZE })
    }
    if (!this.pRetry) {
      this.pRetry = (await import('p-retry')).default
    }
  }

  /**
   * Load cache from file
   */
  private loadCacheFromFile(): void {
    if (!this.cacheFile) return

    try {
      const data = fs.readFileSync(this.cacheFile, 'utf-8')
      const cacheData = JSON.parse(data)

      // Clear existing cache and populate with file data
      cache.clear()
      Object.entries(cacheData).forEach(([key, value]) => {
        cache.set(key, value as number[])
      })

      console.log(`[EmbeddingService] Loaded ${Object.keys(cacheData).length} cached embeddings`)
    } catch (error) {
      console.warn(`[EmbeddingService] Failed to load cache from file: ${error}`)
    }
  }

  /**
   * Save cache to file
   */
  private saveCacheToFile(): void {
    if (!this.cacheFile || !this.cacheEnabled) return

    try {
      const cacheData: Record<string, number[]> = {}
      cache.forEach((value: any, key: any) => {
        cacheData[key] = value
      })

      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2))
      console.log(`[EmbeddingService] Saved ${Object.keys(cacheData).length} embeddings to cache file`)
    } catch (error) {
      console.warn(`[EmbeddingService] Failed to save cache to file: ${error}`)
    }
  }

  /**
   * Embed a batch of texts with retry logic
   */
  private async embedBatch(texts: string[]): Promise<number[][]> {
    await this.initializeModules()
    return await this.pRetry(() => this.provider.embed(texts), {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000,
      onFailedAttempt: (error: any) => {
        console.warn(`[EmbeddingService] Batch embedding attempt ${error.attemptNumber} failed: ${error.message}`)
      },
    })
  }

  /**
   * Main orchestration method to embed documents
   * @param docs Array of documents with optional IDs
   * @returns Promise<EmbeddingRecord[]> Array of embedding records
   */
  async embedDocuments(docs: DocumentWithId[]): Promise<EmbeddingRecord[]> {
    await this.initializeModules()

    const results: EmbeddingRecord[] = []
    const toBatch: { idx: number; text: string; id: string }[] = []

    // Prepare batch list and consult cache
    for (let i = 0; i < docs.length; i++) {
      const text = docs[i].text
      const id = docs[i].id ?? sha1(text)
      const key = getCacheKey(id)

      if (this.cacheEnabled) {
        const cached = cache.get(key)
        if (cached) {
          results.push({
            id,
            text,
            vector: cached,
            metadata: docs[i].metadata ?? {},
          })
          continue
        }
      }

      toBatch.push({ idx: i, text, id })
    }

    console.log(`[EmbeddingService] Processing ${toBatch.length} new embeddings (${results.length} from cache)`)

    // Process in batches
    for (let i = 0; i < toBatch.length; i += this.batchSize) {
      const batch = toBatch.slice(i, i + this.batchSize)
      const texts = batch.map((b) => b.text)

      console.log(
        `[EmbeddingService] Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(
          toBatch.length / this.batchSize,
        )}`,
      )

      const vectors = await this.embedBatch(texts)

      vectors.forEach((vec, j) => {
        const id = batch[j].id
        const metadata = docs[batch[j].idx].metadata ?? {}
        const key = getCacheKey(id)

        if (this.cacheEnabled) {
          cache.set(key, vec)
        }

        results.push({
          id,
          text: batch[j].text,
          vector: vec,
          metadata,
        })
      })
    }

    // Save cache to file if enabled
    if (this.cacheEnabled && this.cacheFile) {
      this.saveCacheToFile()
    }

    return results
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ size: number; maxSize: number; hitRate?: number }> {
    await this.initializeModules()
    return {
      size: cache.size,
      maxSize: cache.max,
      // Note: LRU cache doesn't provide hit rate by default
      // You'd need to implement custom tracking for this
    }
  }

  /**
   * Clear the cache
   */
  async clearCache(): Promise<void> {
    await this.initializeModules()
    cache.clear()
    console.log('[EmbeddingService] Cache cleared')
  }
}

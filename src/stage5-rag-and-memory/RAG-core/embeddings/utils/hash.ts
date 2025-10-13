import crypto from 'crypto'

/**
 * Generate SHA1 hash for text content
 * Used for creating unique IDs for caching embeddings
 */
export const sha1 = (text: string): string => {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex')
}

/**
 * Generate a cache key for embedding storage
 */
export const getCacheKey = (id: string): string => {
  return `emb:${id}`
}

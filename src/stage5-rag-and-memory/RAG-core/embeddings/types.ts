import { Document } from '@langchain/core/documents'

export interface EmbeddingRecord {
  id: string // unique id for chunk (e.g., hashed)
  vector: number[] // embedding vector
  metadata: Record<string, any>
  text: string
}

export type EmbeddingProviderName = 'openai' | 'cohere' | 'huggingface'

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
}

export interface EmbeddingServiceOptions {
  batchSize?: number
  model?: string
  apiKey?: string
}

export interface DocumentWithId {
  id?: string
  text: string
  metadata?: Record<string, any>
}

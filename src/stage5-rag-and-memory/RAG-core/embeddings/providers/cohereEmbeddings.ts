import { CohereEmbeddings } from '@langchain/community/embeddings/cohere'
import type { EmbeddingProvider, EmbeddingServiceOptions } from '../types'

export class CohereProvider implements EmbeddingProvider {
  private client: CohereEmbeddings

  constructor(opts: EmbeddingServiceOptions = {}) {
    this.client = new CohereEmbeddings({
      apiKey: opts.apiKey ?? process.env.COHERE_API_KEY,
    })
  }

  /**
   * Embed multiple texts using Cohere embeddings
   * @param texts Array of text strings to embed
   * @returns Promise<number[][]> Array of embedding vectors
   */
  async embed(texts: string[]): Promise<number[][]> {
    try {
      return await this.client.embedDocuments(texts)
    } catch (error) {
      console.error('Cohere embedding error:', error)
      throw new Error(`Failed to generate embeddings: ${error}`)
    }
  }
}

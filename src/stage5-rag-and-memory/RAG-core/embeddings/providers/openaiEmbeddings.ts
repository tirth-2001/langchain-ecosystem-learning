import 'dotenv/config'
import { OpenAIEmbeddings } from '@langchain/openai'
import type { EmbeddingProvider, EmbeddingServiceOptions } from '../types'

export class OpenAIProvider implements EmbeddingProvider {
  private client: OpenAIEmbeddings

  constructor(opts: EmbeddingServiceOptions = {}) {
    this.client = new OpenAIEmbeddings({
      model: opts.model ?? 'text-embedding-ada-002',
      openAIApiKey: process.env.OPENAI_API_KEY,
    })
  }

  /**
   * Embed multiple texts using OpenAI embeddings
   * @param texts Array of text strings to embed
   * @returns Promise<number[][]> Array of embedding vectors
   */
  async embed(texts: string[]): Promise<number[][]> {
    try {
      return await this.client.embedDocuments(texts)
    } catch (error) {
      console.error('OpenAI embedding error:', error)
      throw new Error(`Failed to generate embeddings: ${error}`)
    }
  }
}

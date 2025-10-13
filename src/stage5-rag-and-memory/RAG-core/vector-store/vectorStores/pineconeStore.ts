// src/rag/vectorStores/pineconeStore.ts
import 'dotenv/config'
import { PineconeStore } from '@langchain/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import { Pinecone } from '@pinecone-database/pinecone'

export class PineconeVectorStore {
  private store: PineconeStore | null = null
  private client: Pinecone
  private indexName: string
  private embedding: OpenAIEmbeddings

  constructor(indexName = 'company-knowledge-index') {
    this.indexName = indexName
    this.client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
    this.embedding = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
  }

  async init(docs?: Document[]) {
    const index = this.client.Index(this.indexName)
    if (docs) {
      this.store = await PineconeStore.fromDocuments(docs, this.embedding, { pineconeIndex: index })
    } else {
      this.store = await PineconeStore.fromExistingIndex(this.embedding, { pineconeIndex: index })
    }
  }

  async addDocuments(docs: Document[]) {
    if (!this.store) throw new Error('Store not initialized')
    await this.store.addDocuments(docs)
  }

  async similaritySearch(query: string, k = 3) {
    if (!this.store) throw new Error('Store not initialized')
    const results = await this.store.similaritySearch(query, k)
    return results.map((r) => ({
      id: r.metadata?.id ?? '',
      score: (r as any).score ?? 0,
      metadata: r.metadata,
      text: r.pageContent,
    }))
  }
}

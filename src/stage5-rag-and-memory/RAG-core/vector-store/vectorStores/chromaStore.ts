// src/rag/vectorStores/chromaStore.ts
import 'dotenv/config'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'

export class ChromaVectorStore {
  private store: Chroma | null = null
  private embedding: OpenAIEmbeddings
  private collectionName: string

  constructor(collectionName = 'company-knowledge-collection') {
    this.collectionName = collectionName
    this.embedding = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
  }

  async init(docs?: Document[]) {
    if (docs) {
      console.log('🆕 Initializing new Chroma collection...')
      this.store = await Chroma.fromDocuments(docs, this.embedding, {
        collectionName: this.collectionName,
      })
    } else {
      this.store = new Chroma(this.embedding, { collectionName: this.collectionName })
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

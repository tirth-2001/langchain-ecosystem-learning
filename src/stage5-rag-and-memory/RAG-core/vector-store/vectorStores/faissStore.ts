// src/rag/vectorStores/faissStore.ts
import { FaissStore } from '@langchain/community/vectorstores/faiss'
import { OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import * as fs from 'fs'

export class FaissVectorStore {
  private store: FaissStore | null = null
  private persistPath: string
  private embedding: OpenAIEmbeddings

  constructor(persistPath = './vector/faiss.index') {
    this.persistPath = persistPath
    this.embedding = new OpenAIEmbeddings({ model: 'text-embedding-3-small' })
  }

  async init(docs?: Document[]) {
    try {
      if (fs.existsSync(this.persistPath)) {
        console.log('🔄 Loading existing FAISS index...')
        this.store = await FaissStore.load(this.persistPath, this.embedding)
      } else if (docs && docs.length > 0) {
        console.log('🆕 Creating new FAISS index...')
        this.store = await FaissStore.fromDocuments(docs, this.embedding)
        // Ensure the directory exists before saving
        const dir = this.persistPath.substring(0, this.persistPath.lastIndexOf('/'))
        if (dir && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        await this.store.save(this.persistPath)
      } else {
        throw new Error('No documents provided and FAISS index not found')
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('faiss-node')) {
        throw new Error(
          'FAISS requires the faiss-node dependency. Please install it with: npm install faiss-node --legacy-peer-deps\n' +
            'Or use Chroma instead by changing the vector store type in your configuration.',
        )
      }
      throw error
    }
  }

  async addDocuments(docs: Document[]) {
    if (!this.store) throw new Error('Store not initialized')
    await this.store.addDocuments(docs)
    await this.store.save(this.persistPath)
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

  async deleteAll() {
    if (fs.existsSync(this.persistPath)) fs.rmSync(this.persistPath)
    this.store = null
  }
}

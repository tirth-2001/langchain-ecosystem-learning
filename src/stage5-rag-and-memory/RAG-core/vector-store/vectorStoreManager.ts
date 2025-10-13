// src/rag/vectorStoreManager.ts
import { FaissVectorStore } from './vectorStores/faissStore'
import { ChromaVectorStore } from './vectorStores/chromaStore'
import { PineconeVectorStore } from './vectorStores/pineconeStore'

export class VectorStoreManager {
  private provider: FaissVectorStore | ChromaVectorStore | PineconeVectorStore

  constructor(type: 'faiss' | 'chroma' | 'pinecone') {
    if (type === 'faiss') this.provider = new FaissVectorStore() as FaissVectorStore
    else if (type === 'chroma') this.provider = new ChromaVectorStore()
    else if (type === 'pinecone') this.provider = new PineconeVectorStore()
    else throw new Error('Invalid store type')
  }

  async init(docs?: any[]) {
    await this.provider.init(docs)
  }

  async addDocuments(docs: any[]) {
    await this.provider.addDocuments(docs)
  }

  async search(query: string, k = 3) {
    return await this.provider.similaritySearch(query, k)
  }
}

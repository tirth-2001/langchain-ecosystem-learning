// src/rag/example/vectorStoreExample.ts

import { chunkDocuments } from '../document-ingestion/chunker'
import { loadLocalDocuments } from '../document-ingestion/fileLoader'
import { VectorStoreManager } from './vectorStoreManager'

async function main() {
  const docs = await loadLocalDocuments('./src/stage5-rag-and-memory/RAG-core/document-ingestion/data')
  const chunks = await chunkDocuments(docs, 500, 100)

  const storeManager = new VectorStoreManager('chroma')
  await storeManager.init(chunks)

  console.log("🔍 Searching for: 'refund policy for damaged items'")
  const results = await storeManager.search('refund policy for damaged items', 3)
  console.log(
    'Results:',
    results.map((r) => r.text),
  )
}

main().catch(console.error)

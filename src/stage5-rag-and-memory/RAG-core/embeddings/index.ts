import path from 'path'
import { loadLocalDocuments } from '../document-ingestion/fileLoader'
import { chunkDocuments } from '../document-ingestion/chunker'
import { EmbeddingService } from './embeddingService'
import { EmbeddingProviderName } from './types'

/**
 * Demo function showing the complete pipeline:
 * Document Loading → Chunking → Embedding Generation
 */
async function main() {
  // Configuration
  const dataDir = path.join(__dirname, '../document-ingestion/data')
  const provider: EmbeddingProviderName = 'openai' // Change to 'cohere' or 'huggingface' as needed
  const cacheFile = path.join(__dirname, 'cache/embeddings-cache.json')

  console.log('🚀 Starting Embedding Pipeline Demo')
  console.log(`📁 Data directory: ${dataDir}`)
  console.log(`🔧 Provider: ${provider}`)
  console.log(`💾 Cache file: ${cacheFile}`)

  try {
    // Step 1: Load documents
    console.log('\n📄 Step 1: Loading documents...')
    const docs = await loadLocalDocuments(dataDir)
    console.log(`✅ Loaded ${docs.length} documents`)

    // Step 2: Chunk documents
    console.log('\n✂️  Step 2: Chunking documents...')
    const chunkedDocs = await chunkDocuments(docs, 500, 100)
    console.log(`✅ Chunked into ${chunkedDocs.length} chunks`)

    // Step 3: Prepare documents for embedding
    const documentsForEmbedding = chunkedDocs.map((doc, i) => ({
      id: `${doc.metadata?.source ?? 'doc'}::${i}`,
      text: doc.pageContent,
      metadata: doc.metadata ?? {},
    }))

    // Step 4: Initialize embedding service
    console.log('\n🧠 Step 3: Initializing embedding service...')
    const embeddingService = new EmbeddingService(provider, {
      batchSize: 32, // Smaller batch for demo
      model: provider === 'openai' ? 'text-embedding-ada-002' : undefined,
      cacheEnabled: true,
      cacheFile: cacheFile,
    })

    // Step 5: Generate embeddings
    console.log('\n🔢 Step 4: Generating embeddings...')
    const startTime = Date.now()
    const embeddings = await embeddingService.embedDocuments(documentsForEmbedding)
    const endTime = Date.now()

    console.log(`✅ Generated ${embeddings.length} embeddings in ${endTime - startTime}ms`)
    console.log(`📊 Cache stats:`, embeddingService.getCacheStats())

    // Step 6: Display sample results
    console.log('\n📋 Sample Results:')
    embeddings.slice(0, 3).forEach((emb, i) => {
      console.log(`\n${i + 1}. ID: ${emb.id}`)
      console.log(`   Text: ${emb.text.substring(0, 100)}...`)
      console.log(`   Vector dimension: ${emb.vector.length}`)
      console.log(`   Metadata:`, emb.metadata)
    })

    console.log('\n🎉 Embedding pipeline completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   - Store embeddings in a vector database (Pinecone, Weaviate, etc.)')
    console.log('   - Implement similarity search functionality')
    console.log('   - Build RAG retrieval system')
  } catch (error) {
    console.error('❌ Error in embedding pipeline:', error)
    process.exit(1)
  }
}

main().catch(console.error)

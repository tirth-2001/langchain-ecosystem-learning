# Embeddings Module

This module provides a comprehensive embedding generation system with support for multiple providers, batching, caching, and error handling.

## Features

- **Multi-provider support**: OpenAI, Cohere, and HuggingFace embeddings
- **Batching**: Efficient batch processing to optimize throughput and cost
- **Caching**: In-memory and file-based caching to avoid recomputing embeddings
- **Error handling**: Retry logic with exponential backoff
- **Type safety**: Full TypeScript support with proper type definitions

## Quick Start

```typescript
import { EmbeddingService } from './embeddingService'
import { loadLocalDocuments } from '../document-ingestion/fileLoader'
import { chunkDocuments } from '../document-ingestion/chunker'

// Load and chunk documents
const docs = await loadLocalDocuments('./data')
const chunks = await chunkDocuments(docs, 500, 100)

// Initialize embedding service
const embeddingService = new EmbeddingService('openai', {
  batchSize: 64,
  model: 'text-embedding-3-small',
  cacheEnabled: true,
})

// Generate embeddings
const embeddings = await embeddingService.embedDocuments(chunks)
```

## Configuration

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Cohere
COHERE_API_KEY=your_cohere_api_key

# HuggingFace
HF_API_KEY=your_huggingface_api_key
```

### Provider Options

| Provider    | Default Model                            | Notes                        |
| ----------- | ---------------------------------------- | ---------------------------- |
| OpenAI      | `text-embedding-3-small`                 | High quality, cost-effective |
| Cohere      | `embed-english-v2.0`                     | Good multilingual support    |
| HuggingFace | `sentence-transformers/all-MiniLM-L6-v2` | Free, can run locally        |

## API Reference

### EmbeddingService

```typescript
class EmbeddingService {
  constructor(
    providerName: 'openai' | 'cohere' | 'huggingface',
    options?: {
      batchSize?: number
      model?: string
      apiKey?: string
      cacheEnabled?: boolean
      cacheFile?: string
    },
  )

  async embedDocuments(docs: DocumentWithId[]): Promise<EmbeddingRecord[]>
  getCacheStats(): { size: number; maxSize: number }
  clearCache(): void
}
```

### Types

```typescript
interface EmbeddingRecord {
  id: string
  vector: number[]
  metadata: Record<string, any>
  text: string
}

interface DocumentWithId {
  id?: string
  text: string
  metadata?: Record<string, any>
}
```

## Production Considerations

- **Batch size tuning**: Larger batches improve throughput but may hit rate limits
- **Cache management**: Use file-based caching for persistence across restarts
- **Error handling**: Implement fallback providers for high availability
- **Cost monitoring**: Track token usage and API calls
- **Vector dimensions**: Ensure consistency between providers and vector stores

## Examples

See `index.ts` for a complete pipeline example that demonstrates:

- Document loading and chunking
- Embedding generation with caching
- Error handling and logging
- Performance monitoring

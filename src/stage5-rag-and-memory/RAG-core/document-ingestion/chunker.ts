import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from '@langchain/core/documents'

export const chunkDocuments = async (docs: Document[], chunkSize = 1000, chunkOverlap = 200): Promise<Document[]> => {
  console.log(`[Chunker] Input documents: ${docs.length}`)
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  })

  const chunks = await splitter.splitDocuments(docs)
  console.log(`[Chunker] Output chunks: ${chunks.length}`)
  return chunks
}

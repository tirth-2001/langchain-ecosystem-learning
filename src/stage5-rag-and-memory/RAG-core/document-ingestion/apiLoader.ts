import { Document } from '@langchain/core/documents'

export const loadFromApi = async (endpoint: string): Promise<Document[]> => {
  const response = await fetch(endpoint)
  const data = await response.json()

  const documents: Document[] = []

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      documents.push(
        new Document({
          pageContent: JSON.stringify(item, null, 2),
          metadata: { source: endpoint, index },
        }),
      )
    })
  } else {
    documents.push(
      new Document({
        pageContent: JSON.stringify(data, null, 2),
        metadata: { source: endpoint },
      }),
    )
  }

  console.log('[API Loader] Documents', documents)

  return documents
}

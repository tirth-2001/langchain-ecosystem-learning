import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { Document } from '@langchain/core/documents'

export const loadFromUrls = async (urls: string[]): Promise<Document[]> => {
  const documents: Document[] = []

  for (const url of urls) {
    const loader = new CheerioWebBaseLoader(url)
    const loaded = await loader.load()
    loaded.forEach((d: Document) => (d.metadata = { ...d.metadata, source: url }))
    documents.push(...loaded)
  }

  console.log('[URL Loader] Documents', documents)

  return documents
}

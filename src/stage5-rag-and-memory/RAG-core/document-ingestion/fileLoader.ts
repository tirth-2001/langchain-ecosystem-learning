import { Document } from '@langchain/core/documents'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import fs from 'fs'
import path from 'path'

/**
 * Load local documents from a directory. Supports .txt, .md, .pdf, .json.
 * For JSON, we read the file and wrap it into a single Document.
 */
export const loadLocalDocuments = async (dirPath: string): Promise<Document[]> => {
  console.log(`[File Loader] Loading from directory: ${dirPath}`)
  const entries = fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : []
  console.log(`[File Loader] Found ${entries.length} files:`, entries)
  const documents: Document[] = []

  for (const fileName of entries) {
    const filePath = path.join(dirPath, fileName)
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) continue

    const ext = path.extname(fileName).toLowerCase()

    if (ext === '.txt' || ext === '.md') {
      const loader = new TextLoader(filePath)
      const loaded = await loader.load()
      loaded.forEach((d: Document) => (d.metadata = { ...d.metadata, source: filePath }))
      documents.push(...loaded)
      continue
    }

    // if (ext === '.pdf') {
    //   const loader = new PDFLoader(filePath)
    //   const loaded = await loader.load()
    //   loaded.forEach((d: Document) => (d.metadata = { ...d.metadata, source: filePath }))
    //   documents.push(...loaded)
    //   continue
    // }

    if (ext === '.json') {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const jsonValue = JSON.parse(raw)
        documents.push(
          new Document({
            pageContent: JSON.stringify(jsonValue, null, 2),
            metadata: { source: filePath, type: 'json' },
          }),
        )
      } catch (err) {
        // If JSON parsing fails, skip this file rather than crashing the pipeline
        // This is intentional to keep ingestion resilient.
        continue
      }
      continue
    }
  }

  console.log('[File Loader] Documents', documents)

  return documents
}

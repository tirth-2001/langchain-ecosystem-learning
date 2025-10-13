import path from 'path'
import { loadLocalDocuments } from './fileLoader'
import { loadFromUrls } from './urlLoader'
import { loadFromApi } from './apiLoader'
import { chunkDocuments } from './chunker'

async function main() {
  const dataDir = path.join(__dirname, 'data')

  const localDocs = await loadLocalDocuments(dataDir)
  const webDocs = await loadFromUrls(['https://en.wikipedia.org/wiki/World_economy'])
  const apiDocs = await loadFromApi('https://jsonplaceholder.typicode.com/posts?_start=0&_limit=10')

  const allDocs = [...localDocs, ...webDocs, ...apiDocs]
  const chunkedDocs = await chunkDocuments(allDocs)

  console.log(`Loaded ${allDocs.length} raw docs, chunked into ${chunkedDocs.length}`)
}

main().catch(console.log)

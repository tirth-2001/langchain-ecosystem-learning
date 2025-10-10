import { Tool } from '@langchain/core/tools'
import { retry } from '../utils/retryWrapper'
import { contextStore } from '../utils/contextStore'
import * as fs from 'fs'
import * as path from 'path'

export class RestaurantSearchTool extends Tool {
  name = 'restaurant_search_tool'
  description = 'Searches available restaurants matching cuisine or name'

  async _call(input: string): Promise<string> {
    try {
      return await retry(async () => {
        const dataPath = path.join(__dirname, '../data/mockRestaurants.json')
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
        const match = data.find((r: any) => r.name.toLowerCase().includes(input.toLowerCase()))
        if (!match) throw new Error(`No restaurant found for '${input}'`)

        contextStore.set({ restaurant: match.name })
        return `Found restaurant: ${match.name}, located at ${match.location}`
      })
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  }
}

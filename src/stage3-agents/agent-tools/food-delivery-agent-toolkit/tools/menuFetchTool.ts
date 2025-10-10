import { Tool } from '@langchain/core/tools'
import { contextStore } from '../utils/contextStore'
import * as fs from 'fs'
import * as path from 'path'

export class MenuFetchTool extends Tool {
  name = 'menu_fetch_tool'
  description = 'Fetches menu items for the current restaurant in context'

  async _call(): Promise<string> {
    try {
      const { restaurant } = contextStore.get()
      if (!restaurant) throw new Error('No restaurant in context!')

      const dataPath = path.join(__dirname, '../data/mockMenus.json')
      const menus = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

      const menu = menus[restaurant]
      if (!menu) throw new Error(`No menu found for ${restaurant}`)

      contextStore.set({ menu })
      return `Menu for ${restaurant}: ${menu.join(', ')}`
    } catch (err: any) {
      return `Error fetching menu: ${err.message}`
    }
  }
}

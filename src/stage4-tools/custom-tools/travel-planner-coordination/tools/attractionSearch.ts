// tools/attractionSearch.ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * AttractionSearch
 * - input: { city: string, limit?: number }
 * - output: stringified JSON { city, attractions: string[] }
 */
export const AttractionSearch = new DynamicStructuredTool({
  name: 'AttractionSearch',
  description: 'Return top attractions for a city.',
  schema: z.object({
    city: z.string(),
    limit: z.number().optional(),
  }),
  func: async (input: unknown) => {
    const { city, limit = 5 } = z.object({ city: z.string(), limit: z.number().optional() }).parse(input)

    // Mocked data (replace with real API call in production)
    const sampleDB: Record<string, string[]> = {
      Kyoto: ['Fushimi Inari Shrine', 'Kiyomizu-dera', 'Arashiyama Bamboo Grove', 'Gion', 'Nijo Castle'],
      Paris: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Montmartre', 'Seine River Cruise'],
      Tokyo: ['Shibuya Crossing', 'Senso-ji Temple', 'Tokyo Skytree', 'Meiji Shrine', 'Asakusa'],
    }

    const attractions = sampleDB[city] ?? [`Top sights in ${city} (mocked)`]
    return JSON.stringify({ city, attractions: attractions.slice(0, limit) })
  },
})

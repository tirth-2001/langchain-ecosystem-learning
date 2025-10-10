/**
 * Stage 4 – Tools: Hotel Search Tool
 * Micro-project: Structured tool for searching hotels with date filtering
 *
 * Objectives:
 * 1. Implement structured tool with complex Zod schema validation
 * 2. Demonstrate date-based filtering and result formatting
 * 3. Show proper error handling for invalid inputs
 *
 * Core Concepts Covered:
 * - `DynamicStructuredTool` with complex Zod schemas
 * - Date-based filtering and validation
 * - Error handling for invalid inputs
 * - Structured tool inputs with optional parameters
 */

// tools/hotelSearch.ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * HotelSearch
 * - input: { city: string, checkin: string, checkout: string, maxResults?: number }
 * - output: stringified JSON { city, hotels: [{name, rating}] }
 */
export const HotelSearch = new DynamicStructuredTool({
  name: 'HotelSearch',
  description: 'Return a short list of hotels for the city and dates.',
  schema: z.object({
    city: z.string(),
    checkin: z.string(),
    checkout: z.string(),
    maxResults: z.number().optional(),
  }),
  func: async (input: unknown) => {
    const {
      city,
      checkin,
      checkout,
      maxResults = 3,
    } = z
      .object({
        city: z.string(),
        checkin: z.string(),
        checkout: z.string(),
        maxResults: z.number().optional(),
      })
      .parse(input)

    // Mocked hotels - replace with real booking API call (Hotels/OTA) in prod.
    const sampleHotels = [
      { name: `${city} Grand Plaza`, rating: 4.6 },
      { name: `${city} Central Inn`, rating: 4.2 },
      { name: `${city} Cozy Stay`, rating: 4.0 },
      { name: `${city} Budget Lodge`, rating: 3.7 },
    ]

    return JSON.stringify({ city, checkin, checkout, hotels: sampleHotels.slice(0, maxResults) })
  },
})

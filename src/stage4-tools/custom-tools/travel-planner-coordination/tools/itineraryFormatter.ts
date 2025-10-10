/**
 * Stage 4 – Tools: Itinerary Formatter Tool
 * Micro-project: Complex tool for formatting multi-day travel itineraries
 *
 * Objectives:
 * 1. Implement complex structured tool with multiple input types
 * 2. Demonstrate data aggregation and formatting
 * 3. Show proper error handling for complex inputs
 *
 * Core Concepts Covered:
 * - `DynamicStructuredTool` with complex schemas
 * - Data aggregation and formatting
 * - Error handling for complex inputs
 * - Multi-day itinerary generation
 */

// tools/itineraryFormatter.ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * ItineraryFormatter
 * - input: { city, attractions: string[], weather: string, hotels?: any, totalDays?: number }
 * - output: stringified JSON object with a day-wise itinerary
 */
export const ItineraryFormatter = new DynamicStructuredTool({
  name: 'ItineraryFormatter',
  description: 'Format a multi-day itinerary from collated tool outputs.',
  schema: z.object({
    city: z.string(),
    attractions: z.array(z.string()),
    weather: z.string(),
    hotels: z.any().optional(),
    totalDays: z.number().optional(),
  }),
  func: async (input: unknown) => {
    const {
      city,
      attractions,
      weather,
      hotels = [],
      totalDays = 2,
    } = z
      .object({
        city: z.string(),
        attractions: z.array(z.string()),
        weather: z.string(),
        hotels: z.any().optional(),
        totalDays: z.number().optional(),
      })
      .parse(input)

    // Build a very simple itinerary: take first `totalDays` attractions (or rotate)
    const days = []
    for (let d = 0; d < totalDays; d++) {
      const place = attractions[d] ?? attractions[d % attractions.length] ?? 'Explore local area'
      days.push({ day: d + 1, plan: `Morning: Visit ${place}. Afternoon: Local food / walking. Note: ${weather}` })
    }

    const itinerary = { city, hotels, weather, days }
    return JSON.stringify(itinerary, null, 2)
  },
})

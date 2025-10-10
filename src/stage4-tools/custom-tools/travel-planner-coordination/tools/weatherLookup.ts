/**
 * Stage 4 – Tools: Weather Lookup Tool
 * Micro-project: Structured tool for weather information retrieval
 *
 * Objectives:
 * 1. Implement structured tool with optional date parameter
 * 2. Demonstrate mock weather API integration
 * 3. Show proper error handling and response formatting
 *
 * Core Concepts Covered:
 * - `DynamicStructuredTool` with optional parameters
 * - Mock API integration for weather data
 * - Error handling and response formatting
 * - Date-based weather queries
 */

// tools/weatherLookup.ts
import { z } from 'zod'
import { DynamicStructuredTool } from '@langchain/core/tools'

/**
 * WeatherLookup
 * - input: { city: string, date?: string }
 * - output: stringified JSON { city, date?, forecast }
 */
export const WeatherLookup = new DynamicStructuredTool({
  name: 'WeatherLookup',
  description: 'Return a short weather summary for a city (mocked).',
  schema: z.object({
    city: z.string(),
    date: z.string().optional(),
  }),
  func: async (input: unknown) => {
    const { city, date } = z.object({ city: z.string(), date: z.string().optional() }).parse(input)

    // Mocked weather - replace with a real weather API in production
    const forecasts: Record<string, string> = {
      Kyoto: 'Sunny, 22°C / 14°C',
      Paris: 'Light rain, 16°C / 9°C',
      Tokyo: 'Cloudy, 25°C / 18°C',
    }

    const forecast = forecasts[city] ?? 'Partly cloudy, temperature unknown'
    return JSON.stringify({ city, date: date ?? null, forecast })
  },
})

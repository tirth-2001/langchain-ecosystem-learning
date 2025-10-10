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

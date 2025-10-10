// utils/toolRegistry.ts
import { AttractionSearch } from '../tools/attractionSearch'
import { WeatherLookup } from '../tools/weatherLookup'
import { HotelSearch } from '../tools/hotelSearch'
import { ItineraryFormatter } from '../tools/itineraryFormatter'

/**
 * Central registry for all available tools in the travel planner system.
 * This serves as the single source of truth for tool definitions.
 */

export interface ToolDefinition {
  name: string
  description: string
  exampleArgs: Record<string, any>
  exampleUsage: string
}

export const TOOL_REGISTRY: Record<string, any> = {
  AttractionSearch,
  WeatherLookup,
  HotelSearch,
  ItineraryFormatter,
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'AttractionSearch',
    description: 'Return top attractions for a city.',
    exampleArgs: { city: 'Kyoto', limit: 5 },
    exampleUsage: 'Find popular tourist attractions in a specific city',
  },
  {
    name: 'WeatherLookup',
    description: 'Return a short weather summary for a city (mocked).',
    exampleArgs: { city: 'Kyoto', date: '2025-11-10' },
    exampleUsage: 'Get current weather forecast for travel planning',
  },
  {
    name: 'HotelSearch',
    description: 'Return a short list of hotels for the city and dates.',
    exampleArgs: { city: 'Kyoto', checkin: '2025-11-10', checkout: '2025-11-12', maxResults: 3 },
    exampleUsage: 'Search for available hotels with check-in/check-out dates',
  },
  {
    name: 'ItineraryFormatter',
    description: 'Format a multi-day itinerary from collated tool outputs.',
    exampleArgs: {
      city: 'Kyoto',
      attractions: ['Fushimi Inari Shrine', 'Kiyomizu-dera'],
      weather: 'Sunny, 22°C',
      hotels: [{ name: 'Kyoto Grand Plaza', rating: 4.6 }],
      totalDays: 2,
    },
    exampleUsage: 'Create a formatted day-by-day travel itinerary',
  },
]

/**
 * Get all available tool names as an array
 */
export function getToolNames(): string[] {
  return TOOL_DEFINITIONS.map((tool) => tool.name)
}

/**
 * Get tool names as a union type string for prompts
 */
export function getToolNamesUnion(): string {
  return TOOL_DEFINITIONS.map((tool) => tool.name).join(' | ')
}

/**
 * Get tool by name
 */
export function getTool(name: string) {
  return TOOL_REGISTRY[name]
}

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: string): ToolDefinition | undefined {
  return TOOL_DEFINITIONS.find((tool) => tool.name === name)
}

/**
 * Validate that all tools in the registry have corresponding definitions
 */
export function validateToolRegistry(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check that all tools in registry have definitions
  for (const toolName of Object.keys(TOOL_REGISTRY)) {
    if (!getToolDefinition(toolName)) {
      errors.push(`Tool "${toolName}" is in registry but missing definition`)
    }
  }

  // Check that all definitions have corresponding tools
  for (const definition of TOOL_DEFINITIONS) {
    if (!TOOL_REGISTRY[definition.name]) {
      errors.push(`Tool definition "${definition.name}" has no corresponding tool in registry`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

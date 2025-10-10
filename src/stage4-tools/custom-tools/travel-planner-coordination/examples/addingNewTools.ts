// examples/addingNewTools.ts
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Example showing how to add new tools to the system.
 * This demonstrates the maintainability benefits of the dynamic prompt system.
 */

// Step 1: Create the new tool
export const RestaurantSearch = new DynamicStructuredTool({
  name: 'RestaurantSearch',
  description: 'Find restaurants in a city with cuisine preferences.',
  schema: z.object({
    city: z.string(),
    cuisine: z.string().optional(),
    priceRange: z.enum(['budget', 'mid', 'luxury']).optional(),
    maxResults: z.number().optional(),
  }),
  func: async (input: unknown) => {
    const {
      city,
      cuisine,
      priceRange,
      maxResults = 5,
    } = z
      .object({
        city: z.string(),
        cuisine: z.string().optional(),
        priceRange: z.enum(['budget', 'mid', 'luxury']).optional(),
        maxResults: z.number().optional(),
      })
      .parse(input)

    // Mocked restaurant data
    const sampleRestaurants = [
      { name: `${city} Fine Dining`, cuisine: 'International', priceRange: 'luxury', rating: 4.8 },
      { name: `${city} Local Bistro`, cuisine: 'Local', priceRange: 'mid', rating: 4.5 },
      { name: `${city} Street Food`, cuisine: 'Street', priceRange: 'budget', rating: 4.2 },
    ]

    const filtered = sampleRestaurants.filter(
      (r) =>
        (!cuisine || r.cuisine.toLowerCase().includes(cuisine.toLowerCase())) &&
        (!priceRange || r.priceRange === priceRange),
    )

    return JSON.stringify({
      city,
      cuisine,
      priceRange,
      restaurants: filtered.slice(0, maxResults),
    })
  },
})

// Step 2: Add to tool registry (this is the ONLY place you need to update!)
// In a real scenario, you would update the toolRegistry.ts file:

/*
// Add to TOOL_REGISTRY:
export const TOOL_REGISTRY: Record<string, any> = {
  AttractionSearch,
  WeatherLookup,
  HotelSearch,
  ItineraryFormatter,
  RestaurantSearch, // <- Add this line
}

// Add to TOOL_DEFINITIONS:
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ... existing tools ...
  {
    name: 'RestaurantSearch',
    description: 'Find restaurants in a city with cuisine preferences.',
    exampleArgs: { city: 'Kyoto', cuisine: 'Japanese', priceRange: 'mid', maxResults: 3 },
    exampleUsage: 'Search for restaurants matching specific cuisine and price preferences',
  },
]
*/

// Step 3: That's it! The prompt will automatically include the new tool
// No need to update:
// - Prompt templates
// - Orchestrator code
// - Documentation
// - Examples

/**
 * Example of how the system automatically adapts:
 */
export function demonstrateAutomaticAdaptation() {
  console.log('=== Before Adding RestaurantSearch ===')
  console.log('Available tools would be: AttractionSearch, WeatherLookup, HotelSearch, ItineraryFormatter')
  console.log(
    'Prompt would show: "Use the exact tool names: AttractionSearch | WeatherLookup | HotelSearch | ItineraryFormatter"',
  )

  console.log('\n=== After Adding RestaurantSearch ===')
  console.log(
    'Available tools would be: AttractionSearch, WeatherLookup, HotelSearch, ItineraryFormatter, RestaurantSearch',
  )
  console.log(
    'Prompt would automatically show: "Use the exact tool names: AttractionSearch | WeatherLookup | HotelSearch | ItineraryFormatter | RestaurantSearch"',
  )

  console.log('\n=== Benefits ===')
  console.log('✅ No hardcoded tool names in prompts')
  console.log('✅ No need to update multiple files')
  console.log('✅ Automatic validation of tool registry')
  console.log('✅ Consistent tool definitions across the system')
  console.log('✅ Easy to add/remove/modify tools')
}

/**
 * Example of adding a more complex tool
 */
export const FlightSearch = new DynamicStructuredTool({
  name: 'FlightSearch',
  description: 'Search for flights between cities with date preferences.',
  schema: z.object({
    origin: z.string(),
    destination: z.string(),
    departureDate: z.string(),
    returnDate: z.string().optional(),
    passengers: z.number().optional(),
    class: z.enum(['economy', 'business', 'first']).optional(),
  }),
  func: async (input: unknown) => {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = 1,
      class: flightClass = 'economy',
    } = z
      .object({
        origin: z.string(),
        destination: z.string(),
        departureDate: z.string(),
        returnDate: z.string().optional(),
        passengers: z.number().optional(),
        class: z.enum(['economy', 'business', 'first']).optional(),
      })
      .parse(input)

    // Mocked flight data
    const flights = [
      {
        airline: 'Airline A',
        price: 299,
        departure: '08:00',
        arrival: '12:00',
        class: flightClass,
        duration: '4h 00m',
      },
      {
        airline: 'Airline B',
        price: 399,
        departure: '14:00',
        arrival: '18:00',
        class: flightClass,
        duration: '4h 00m',
      },
    ]

    return JSON.stringify({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      class: flightClass,
      flights,
    })
  },
})

/**
 * Migration guide for existing projects
 */
export function migrationGuide() {
  console.log(`
=== Migration Guide: From Hardcoded to Dynamic Tools ===

1. CREATE TOOL REGISTRY:
   - Move all tool imports to utils/toolRegistry.ts
   - Create TOOL_DEFINITIONS array with metadata
   - Add validation functions

2. UPDATE PROMPTS:
   - Replace hardcoded tool names with dynamic generation
   - Use generatePlannerPrompt() instead of manual templates
   - Remove hardcoded JSON examples

3. UPDATE ORCHESTRATOR:
   - Import TOOL_REGISTRY instead of individual tools
   - Remove duplicate tool definitions

4. ADD NEW TOOLS:
   - Create tool file
   - Add to TOOL_REGISTRY
   - Add to TOOL_DEFINITIONS
   - That's it! Everything else updates automatically

5. BENEFITS:
   - Single source of truth for tools
   - Automatic prompt generation
   - Validation and error checking
   - Easy maintenance and scaling
`)
}

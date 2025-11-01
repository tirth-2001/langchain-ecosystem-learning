import { BaseTool } from './baseTool'

export const weatherTool: BaseTool = {
  name: 'weather',
  description: 'Returns mock weather info for a given city.',
  async execute(city) {
    const mockData = {
      temperature: Math.floor(Math.random() * 10 + 25),
      condition: ['Sunny', 'Rainy', 'Cloudy'][Math.floor(Math.random() * 3)],
    }
    return `The weather in ${city} is ${mockData.condition} with ${mockData.temperature}°C.`
  },
}

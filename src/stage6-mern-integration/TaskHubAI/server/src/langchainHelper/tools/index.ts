import { calculatorTool } from './calculatorTool'
import { weatherTool } from './weatherTool'
import { summarizerTools } from './summarizerTool'
import { BaseTool } from './baseTool'

export const availableTools: BaseTool[] = [calculatorTool, weatherTool, summarizerTools]

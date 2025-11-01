import { availableTools } from './index'

export async function runTool(name: string, input: string): Promise<string> {
  const tool = availableTools.find((t) => t.name === name)
  if (!tool) return `Tool "${name}" not found.`
  return await tool.execute(input)
}

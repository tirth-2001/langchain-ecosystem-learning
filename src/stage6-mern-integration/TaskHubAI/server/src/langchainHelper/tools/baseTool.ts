export interface BaseTool {
  name: string
  description: string
  execute: (input: string) => Promise<string>
}

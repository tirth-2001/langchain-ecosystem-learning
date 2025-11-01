import { getChatModel } from '../config/modelProvider'
import { BaseTool } from './baseTool'

export const summarizerTools: BaseTool = {
  name: 'summarizer', // Fixed: unique name
  description: 'Summarizes the given content into 3 concise bullet points',
  async execute(input: string) {
    // Option 1: Use LLM to actually summarize
    const model = getChatModel()
    const response = await model.invoke(`Summarize the following content into exactly 3 bullet points:\n\n${input}`)
    return response.content as string

    // Option 2: Simple mock summarization (for testing)
    // const sentences = input.split('.').filter(s => s.trim()).slice(0, 3)
    // return sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n')
  },
}

import { getChatModel } from '../config/modelProvider'
import { PromptTemplate } from '@langchain/core/prompts'

const llm = getChatModel()

const prompt = PromptTemplate.fromTemplate(
  `You are an assistant performing a task.\nTask description: {description}\nGive your concise output.`,
)

export const runTaskChain = async (description: string) => {
  const chain = prompt.pipe(llm)
  const result = await chain.invoke({ description })
  return result.text
}

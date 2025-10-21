import { ChatOpenAI } from '@langchain/openai'
import type { ChatOpenAIFields } from '@langchain/openai'
import { Config } from '../../config/env'

export const getChatModel = (options: Partial<ChatOpenAIFields> = {}) => {
  return new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.4,
    openAIApiKey: Config.openAIApiKey,
    ...options,
  })
}

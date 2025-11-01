import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { getChatModel } from '../config/modelProvider'

export const createSimpleChatChain = () => {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful AI assistant.'],
    ['human', '{input}'],
  ])

  const model = getChatModel({ streaming: true })

  const chain = RunnableSequence.from([prompt, model])
  return chain
}

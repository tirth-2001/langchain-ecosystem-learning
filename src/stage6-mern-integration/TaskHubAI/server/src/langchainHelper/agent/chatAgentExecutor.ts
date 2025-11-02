import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { getChatModel } from '../config/modelProvider'
import { ChatMessageHistory } from 'langchain/memory'
import { RunnableWithMessageHistory } from '@langchain/core/runnables'
import { availableTools } from '../tools'
import { DynamicTool } from '@langchain/core/tools'
import { getSessionMessages } from '../../services/chatService'

// Store for conversation histories (in production, use Redis/DB)
const messageHistories: Record<string, ChatMessageHistory> = {}

export const chatAgentExecutor = async () => {
  const model = getChatModel({ streaming: true })

  // Prepare tools
  const tools = availableTools.map(
    (t) =>
      new DynamicTool({
        name: t.name,
        description: t.description,
        func: async (input: string) => t.execute(input),
      }),
  )

  // Define prompt structure
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful AI assistant. You can use tools when necessary to provide accurate answers.'],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ])

  // Create tool-calling agent
  const agent = await createToolCallingAgent({
    llm: model,
    tools,
    prompt,
  })

  // Create executor
  const executor = new AgentExecutor({
    agent,
    tools,
  })

  // Wrap with message history for memory
  const withMessageHistory = new RunnableWithMessageHistory({
    runnable: executor,
    // getMessageHistory: async (sessionId) => {
    //   if (!messageHistories[sessionId]) {
    //     messageHistories[sessionId] = new ChatMessageHistory()
    //   }
    //   return messageHistories[sessionId]
    // },
    getMessageHistory: async (sessionId) => {
      const history = new ChatMessageHistory()
      const messages = await getSessionMessages(sessionId)

      for (const msg of messages) {
        if (msg.role === 'human') {
          history.addUserMessage(msg.content)
        } else {
          history.addAIMessage(msg.content)
        }
      }

      return history
    },
    inputMessagesKey: 'input',
    historyMessagesKey: 'chat_history',
  })

  return withMessageHistory
}

import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { availableTools } from '../tools'
import { getChatModel } from '../config/modelProvider'
import { DynamicTool } from '@langchain/core/tools'

export const toolAgentExecutor = async () => {
  const model = getChatModel()

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
    ['system', 'You are a helpful assistant. Use tools when necessary to provide accurate answers.'],
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
    verbose: true,
  })

  return executor
}

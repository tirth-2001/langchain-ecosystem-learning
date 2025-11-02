import { Request, Response } from 'express'
import { getChatModel } from '../langchainHelper/config/modelProvider'
import { createSimpleChatChain } from '../langchainHelper/chains/simpleChatChain'
import { toolAgentExecutor } from '../langchainHelper/agent/toolAgentExecutor'
import { errorResponse, successResponse } from '../utils'
import { chatAgentExecutor } from '../langchainHelper/agent/chatAgentExecutor'
import { findOrCreateSession, saveMessage } from '../services/chatService'

export const testLLM = async (req: Request, res: Response) => {
  try {
    const userPrompt = req?.body?.prompt || 'Give me a motivational quote.'

    const response = await getChatModel().invoke(userPrompt)

    return res.json({
      success: true,
      prompt: userPrompt,
      output: response.content,
    })
  } catch (error: any) {
    console.error('LLM Test Error:', error)
    return res.status(500).json({ success: false, message: 'LLM test failed' })
  }
}

export const askController = async (req: Request, res: Response) => {
  const { query } = req.body

  if (!query) {
    return res.status(400).json({ error: "Missing 'query' field in body" })
  }

  try {
    const chain = createSimpleChatChain()

    // STREAMING: use Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const response = await chain.stream({ input: query })

    for await (const chunk of response) {
      const content = chunk?.content ?? ''
      if (content) {
        // ✅ Send as JSON to preserve all whitespace and special characters
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`)
      }
    }

    // Signal completion
    res.write(`event: end\ndata: {}\n\n`)
    res.end()
  } catch (err: any) {
    console.error('Error in /api/ask:', err.message)
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}

export const askControllerV2 = async (req: Request, res: Response) => {
  const { query, sessionId = 'user-1234', userId } = req.body

  if (!query) {
    return res.status(400).json({ error: "Missing 'query' field in body" })
  }

  try {
    // Find or create session
    const session = await findOrCreateSession(sessionId, userId)
    if (!session) {
      return res.status(400).json({ error: 'Failed to create session' })
    }

    // Save user message
    await saveMessage(session, 'human', query)

    // Initialize agent executor
    const executor = await chatAgentExecutor()

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let finalOutput = ''

    const stream = await executor.streamEvents(
      { input: query },
      {
        configurable: { sessionId: session.sessionId },
        version: 'v2',
      },
    )

    for await (const event of stream) {
      if (event.event === 'on_chat_model_stream') {
        const content = event.data?.chunk?.content
        if (content && typeof content === 'string') {
          finalOutput += content
          res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`)
        }
      }

      if (event.event === 'on_tool_start') {
        res.write(`data: ${JSON.stringify({ type: 'tool_start', tool: event.name })}\n\n`)
      }

      if (event.event === 'on_tool_end') {
        res.write(
          `data: ${JSON.stringify({
            type: 'tool_end',
            tool: event.name,
            output: event.data?.output,
          })}\n\n`,
        )
      }

      if (event.event === 'on_chain_end' && event.name === 'AgentExecutor') {
        const output = event.data?.output?.output
        if (output && typeof output === 'string') {
          finalOutput = output
          res.write(`data: ${JSON.stringify({ chunk: output })}\n\n`)
        }
      }
    }

    // Persist assistant message
    if (finalOutput) {
      await saveMessage(session, 'ai', finalOutput)
    }

    res.write(`event: end\ndata: {}\n\n`)
    res.end()
  } catch (err: any) {
    console.error('Error in /api/ask:', err.message)
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}

export const runTaskAgentController = async (req: Request, res: Response) => {
  try {
    const { query } = req.body
    const executor = await toolAgentExecutor()
    const result = await executor.invoke({ input: query })

    res.json(successResponse(result))
  } catch (err: any) {
    console.error('Agent error:', err)
    res.status(500).json(errorResponse(err.message))
  }
}

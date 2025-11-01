import { Request, Response } from 'express'
import { getChatModel } from '../langchain/config/modelProvider'
import { createSimpleChatChain } from '../langchain/chains/simpleChatChain'

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

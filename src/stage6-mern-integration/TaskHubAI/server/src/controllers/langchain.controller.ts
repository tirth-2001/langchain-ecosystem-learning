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

    // Non-streaming fallback (for debugging)
    // const result = await chain.invoke({ input: query });
    // return res.json({ output: result.content });

    // STREAMING: use Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let buffer = ''

    const response = await chain.stream({ input: query })
    for await (const chunk of response) {
      const content = chunk?.content ?? ''
      buffer += content
      res.write(`data: ${content}\n\n`)
    }

    res.write(`event: end\ndata: ${JSON.stringify({ full: buffer })}\n\n`)
    res.end()
  } catch (err: any) {
    console.error('Error in /api/ask:', err.message)
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
}

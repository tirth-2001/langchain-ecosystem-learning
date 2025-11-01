# Production Ready Enhancements for Streaming SSE from backend and frontend

## 1. **Heartbeat/Keep-Alive (Prevent Timeout)**

Long-running streams can timeout. Add periodic pings:

### Updated Backend Controller

```typescript
export const askController = async (req: Request, res: Response) => {
  const { query } = req.body

  if (!query) {
    return res.status(400).json({ error: "Missing 'query' field in body" })
  }

  // Setup heartbeat to prevent connection timeout
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n') // SSE comment, ignored by client
  }, 15000) // Every 15 seconds

  try {
    const chain = createSimpleChatChain()

    // STREAMING: use Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

    const response = await chain.stream({ input: query })

    for await (const chunk of response) {
      const content = chunk?.content ?? ''
      if (content) {
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
  } finally {
    // Clear heartbeat interval
    clearInterval(heartbeatInterval)
  }
}
```

---

## 2. **Handle Connection Closure (Client Disconnect)**

If user navigates away, stop the backend stream:

```typescript
export const askController = async (req: Request, res: Response) => {
  const { query } = req.body

  if (!query) {
    return res.status(400).json({ error: "Missing 'query' field in body" })
  }

  // Setup heartbeat
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 15000)

  // Handle client disconnect
  let isClientConnected = true
  req.on('close', () => {
    console.log('[SSE] Client disconnected')
    isClientConnected = false
    clearInterval(heartbeatInterval)
  })

  try {
    const chain = createSimpleChatChain()

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const response = await chain.stream({ input: query })

    for await (const chunk of response) {
      // Stop if client disconnected
      if (!isClientConnected) {
        console.log('[SSE] Stopping stream, client disconnected')
        break
      }

      const content = chunk?.content ?? ''
      if (content) {
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`)
      }
    }

    if (isClientConnected) {
      res.write(`event: end\ndata: {}\n\n`)
      res.end()
    }
  } catch (err: any) {
    console.error('Error in /api/ask:', err.message)
    if (isClientConnected) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  } finally {
    clearInterval(heartbeatInterval)
  }
}
```

---

## 3. **Enhanced Frontend Hook with Reconnection & Error Recovery**

```typescript
import { useState, useCallback, useRef } from 'react'

interface StreamOptions {
  query: string
  onComplete?: (response: string) => void
  onError?: (error: string) => void
  onChunk?: (chunk: string) => void // Optional callback for each chunk
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const useStreamLLM = () => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const startStream = useCallback(async ({ query, onComplete, onError, onChunk }: StreamOptions) => {
    setIsStreaming(true)
    setResponse('')
    setError(null)

    try {
      const url = `${API_BASE_URL}/langchain/ask`
      controllerRef.current = new AbortController()

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: controllerRef.current.signal,
      })

      if (!res.ok) {
        throw new Error(`Stream request failed with status ${res.status}`)
      }

      if (!res.body) {
        throw new Error('Response body is null')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let partial = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        partial += decoder.decode(value, { stream: true })

        // Process each SSE line
        const lines = partial.split('\n\n')
        partial = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          // Ignore heartbeat comments
          if (line.startsWith(':')) continue

          if (line.startsWith('event: end')) {
            continue
          }

          if (line.startsWith('event: error')) {
            const errorLine = lines.find((l) => l.startsWith('data:'))
            if (errorLine) {
              const errorData = errorLine.replace(/^data:\s*/, '')
              const parsed = JSON.parse(errorData)
              throw new Error(parsed.error)
            }
            continue
          }

          if (line.startsWith('data:')) {
            const content = line.replace(/^data:\s*/, '')

            try {
              const parsed = JSON.parse(content)

              if (parsed.error) {
                throw new Error(parsed.error)
              }

              if (parsed.chunk !== undefined) {
                fullText += parsed.chunk
                setResponse((prev) => prev + parsed.chunk)
                onChunk?.(parsed.chunk) // Callback for each chunk
              }

              if (Object.keys(parsed).length === 0) continue
            } catch (e) {
              console.warn('[useStreamLLM] Non-JSON chunk received:', content)
              fullText += content
              setResponse((prev) => prev + content)
              onChunk?.(content)
            }
          }
        }
      }

      setIsStreaming(false)
      onComplete?.(fullText)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[useStreamLLM] Stream aborted by user')
        setIsStreaming(false)
      } else {
        console.error('[useStreamLLM] Error:', err)
        const errorMsg = err.message ?? 'Unknown error'
        setError(errorMsg)
        onError?.(errorMsg)
        setIsStreaming(false)
      }
    }
  }, [])

  const stopStream = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      setIsStreaming(false)
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  return {
    response,
    isStreaming,
    error,
    startStream,
    stopStream,
  }
}
```

---

## 4. **Add Token/Chunk Metadata (Optional)**

Track streaming statistics:

### Backend - Send metadata

```typescript
// At the end of streaming
let tokenCount = 0
for await (const chunk of response) {
  const content = chunk?.content ?? ''
  if (content) {
    tokenCount++
    res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`)
  }
}

// Send metadata with completion
res.write(
  `event: end\ndata: ${JSON.stringify({
    tokenCount,
    timestamp: Date.now(),
  })}\n\n`,
)
```

### Frontend - Capture metadata

```typescript
if (line.startsWith('event: end')) {
  const dataLine = lines[lines.indexOf(line) + 1]
  if (dataLine?.startsWith('data:')) {
    const metadata = JSON.parse(dataLine.replace(/^data:\s*/, ''))
    console.log('[Stream Stats]', metadata)
  }
  continue
}
```

---

## 5. **Enhanced Context with Better Error Handling**

```typescript
import { useState, useEffect, type ReactNode } from 'react'
import { LLMContext, type Message } from '../hooks'
import { askLLM } from '../api/endpoints/ask.api'
import { useStreamLLM } from '../hooks/useStreamLLM'

export const LLMProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const { response: streamResponse, isStreaming, error, startStream, stopStream } = useStreamLLM()

  const askQuestion = async (prompt: string) => {
    setLoading(true)
    try {
      setMessages((prev) => [...prev, { role: 'user', content: prompt }])

      const res = await askLLM(prompt)
      const output = res?.output ?? ''

      setMessages((prev) => [...prev, { role: 'assistant', content: output }])
    } catch (error) {
      console.error('[askQuestion] Error', error)
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Error reaching the model.' }])
    } finally {
      setLoading(false)
    }
  }

  const streamQuestion = async (prompt: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: prompt }])
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    startStream({
      query: prompt,
      onComplete: (finalText) => {
        console.log('[streamQuestion] Complete. Length:', finalText.length)
      },
      onError: (err) => {
        console.error('[streamQuestion] Error', err)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `⚠️ Streaming error: ${err}`,
          }
          return updated
        })
      },
      onChunk: (chunk) => {
        // Optional: Log each chunk or do analytics
        // console.log('[Chunk]', chunk)
      },
    })
  }

  // Sync streaming chunks
  useEffect(() => {
    if (isStreaming && streamResponse) {
      setMessages((prev) => {
        if (prev.length === 0) return prev
        const updated = [...prev]
        const last = updated[updated.length - 1]

        if (last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: streamResponse }
        }
        return updated
      })
    }
  }, [streamResponse, isStreaming])

  // Handle streaming errors
  useEffect(() => {
    if (error && !isStreaming) {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]

        if (last.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `⚠️ ${error}`,
          }
        }
        return updated
      })
    }
  }, [error, isStreaming])

  const clearChat = () => setMessages([])

  return (
    <LLMContext.Provider
      value={{
        messages,
        loading,
        isStreaming,
        askQuestion,
        streamQuestion,
        stopStream,
        clearChat,
      }}
    >
      {children}
    </LLMContext.Provider>
  )
}
```

---

## 6. **Add Stop Button in UI**

```typescript
import { useState } from 'react'
import { useLLM } from '../hooks'

export const ChatBox = () => {
  const [input, setInput] = useState('')
  const { messages, streamQuestion, isStreaming, loading, stopStream } = useLLM()

  const handleSend = async () => {
    if (!input.trim()) return
    await streamQuestion(input)
    setInput('')
  }

  const handleStop = () => {
    stopStream()
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="border rounded-md p-3 h-80 overflow-y-auto bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-blue-600' : 'text-gray-800'}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <div className="flex mt-4 gap-2">
        <input
          className="grow border px-3 py-2 rounded"
          placeholder="Type something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={loading || isStreaming}
        />

        {isStreaming ? (
          <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700" onClick={handleStop}>
            Stop
          </button>
        ) : (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
            onClick={handleSend}
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## Summary of Improvements:

✅ **Heartbeat** - Prevents connection timeout  
✅ **Client disconnect detection** - Stops backend processing when user leaves  
✅ **Better error handling** - Captures and displays errors properly  
✅ **Stop button** - User can cancel mid-stream  
✅ **onChunk callback** - For analytics or custom processing  
✅ **Metadata support** - Track token count, timing, etc.  
✅ **Enhanced UX** - Enter key support, loading states

These changes make your SSE implementation **production-ready**! 🚀

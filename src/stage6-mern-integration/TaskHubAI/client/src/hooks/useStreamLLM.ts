/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef } from 'react'

interface StreamOptions {
  query: string
  onComplete?: (response: string) => void
  onError?: (error: string) => void
  onChunk?: (chunk: string) => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const useStreamLLM = () => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const startStream = useCallback(async ({ query, onComplete, onError, onChunk }: StreamOptions) => {
    setIsStreaming(true)
    setResponse('')
    setError(null)

    try {
      const url = `${API_BASE_URL}/langchain/v2/ask`
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

        // Process each SSE message (separated by \n\n)
        const messages = partial.split('\n\n')
        partial = messages.pop() || ''

        for (const message of messages) {
          if (!message.trim()) continue

          // Parse SSE message into event and data
          const lines = message.split('\n')
          let eventType = 'message' // default event type
          let data = ''

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace(/^event:\s*/, '').trim()
            } else if (line.startsWith('data:')) {
              data = line.replace(/^data:\s*/, '').trim()
            } else if (line.startsWith(':')) {
              // Ignore comments (heartbeat)
              continue
            }
          }

          // Handle different event types
          if (eventType === 'error') {
            try {
              const parsed = JSON.parse(data)
              throw new Error(parsed.error || 'Stream error occurred')
            } catch (e: any) {
              throw new Error(e.message || 'Stream error occurred')
            }
          } else if (eventType === 'end') {
            // Stream completed successfully
            console.log('[useStreamLLM] Stream ended')
            continue
          } else {
            // Regular data chunk
            if (data) {
              try {
                const parsed = JSON.parse(data)

                if (parsed.error) {
                  throw new Error(parsed.error)
                }

                if (parsed.chunk !== undefined) {
                  fullText += parsed.chunk
                  setResponse((prev) => prev + parsed.chunk)
                  onChunk?.(parsed.chunk)
                }
              } catch (e) {
                // If JSON parse fails, treat as plain text
                console.warn('[useStreamLLM] Non-JSON chunk received:', { data, error: e })
                fullText += data
                setResponse((prev) => prev + data)
                onChunk?.(data)
              }
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
  }, [])

  return {
    response,
    isStreaming,
    error,
    startStream,
    stopStream,
  }
}

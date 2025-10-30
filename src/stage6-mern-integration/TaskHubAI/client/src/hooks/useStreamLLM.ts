import { useState, useCallback, useRef } from 'react'

interface StreamOptions {
  query: string
  onComplete?: (response: string) => void
  onError?: (error: string) => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const useStreamLLM = () => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [response, setResponse] = useState('')
  const controllerRef = useRef<AbortController | null>(null)

  const startStream = useCallback(async ({ query, onComplete, onError }: StreamOptions) => {
    setIsStreaming(true)
    setResponse('')

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

      if (!res.ok || !res.body) {
        throw new Error(`Stream request failed with status ${res.status}`)
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
          if (line.startsWith('data:')) {
            const content = line.replace(/^data:\s*/, '')
            // "data:" line may contain JSON or plain text
            try {
              const parsed = JSON.parse(content)
              if (parsed.full) {
                // final full message
                fullText = parsed.full
                setResponse(parsed.full)
                continue
              }
              if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch {
              // plain text chunk
              fullText += content
              setResponse((prev) => prev + content)
            }
          }
        }
      }

      setIsStreaming(false)
      onComplete?.(fullText)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('[useStreamLLM] Error:', err)
      onError?.(err.message ?? 'Unknown error')
      setIsStreaming(false)
    }
  }, [])

  const stopStream = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      setIsStreaming(false)
    }
  }, [])

  return { response, isStreaming, startStream, stopStream }
}

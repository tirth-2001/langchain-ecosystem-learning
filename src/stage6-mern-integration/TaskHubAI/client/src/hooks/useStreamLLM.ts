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
          if (!line.trim()) continue

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

              // Handle error
              if (parsed.error) {
                throw new Error(parsed.error)
              }

              // Handle chunk with proper spacing
              if (parsed.chunk !== undefined) {
                fullText += parsed.chunk
                setResponse((prev) => prev + parsed.chunk)
              }

              // Ignore empty end event
              if (Object.keys(parsed).length === 0) continue
            } catch {
              // If JSON parse fails, it might be plain text (fallback)
              console.warn('[useStreamLLM] Non-JSON chunk received:', content)
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
      if (err.name === 'AbortError') {
        console.log('[useStreamLLM] Stream aborted by user')
      } else {
        console.error('[useStreamLLM] Error:', err)
        onError?.(err.message ?? 'Unknown error')
      }
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

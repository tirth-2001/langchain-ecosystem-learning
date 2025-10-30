import { useState, type ReactNode } from 'react'
import { LLMContext, type Message } from '../hooks'
import { askLLM } from '../api/endpoints/ask.api'
import { useStreamLLM } from '../hooks/useStreamLLM'

export const LLMProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  // Streaming state from hook
  const { response: streamResponse, isStreaming, startStream, stopStream } = useStreamLLM()

  // 🔹 REST-based Ask
  const askQuestion = async (prompt: string) => {
    setLoading(true)
    try {
      // Add user message
      setMessages((prev) => [...prev, { role: 'user', content: prompt }])

      const res = await askLLM(prompt)
      const output = res?.output ?? ''

      // Add assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: output }])
    } catch (error) {
      console.error('[askQuestion] Error', error)
      setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Error reaching the model.' }])
    } finally {
      setLoading(false)
    }
  }

  // 🔹 Streaming Ask (SSE)
  const streamQuestion = async (prompt: string) => {
    // Add user message first
    setMessages((prev) => [...prev, { role: 'user', content: prompt }])

    // Add empty assistant message placeholder
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    startStream({
      query: prompt,
      onComplete: (finalText) => {
        // Replace last assistant message with final output
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: finalText }
          return updated
        })
      },
      onError: (err) => {
        console.error('[streamQuestion] Error', err)
        setMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Streaming error occurred.' }])
      },
    })
  }

  // 🔹 Sync partial streaming chunks into messages progressively
  // (This runs whenever streamResponse changes)
  if (isStreaming && streamResponse) {
    // Update only last assistant message dynamically
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

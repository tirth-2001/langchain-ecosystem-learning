import { useState, useEffect, type ReactNode } from 'react'
import { LLMContext, type Message } from '../hooks'
import { askLLM } from '../api/endpoints/ask.api'
import { useStreamLLM } from '../hooks/useStreamLLM'

export const LLMProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const { response: streamResponse, isStreaming, startStream, stopStream } = useStreamLLM()

  // 🔹 REST-based Ask
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

  // 🔹 Streaming Ask (SSE)
  const streamQuestion = async (prompt: string) => {
    // Add user message first
    setMessages((prev) => [...prev, { role: 'user', content: prompt }])

    // Add empty assistant message placeholder
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    startStream({
      query: prompt,
      onComplete: (finalText) => {
        // Final update happens via useEffect below
        console.log('[streamQuestion] Stream complete:', finalText.substring(0, 50))
      },
      onError: (err) => {
        console.error('[streamQuestion] Error', err)
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Streaming error occurred.' }
          return updated
        })
      },
    })
  }

  // 🔹 Sync streaming chunks into messages (FIXED with useEffect)
  useEffect(() => {
    if (isStreaming && streamResponse) {
      setMessages((prev) => {
        if (prev.length === 0) return prev
        const updated = [...prev]
        const last = updated[updated.length - 1]

        // Only update if last message is from assistant
        if (last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: streamResponse }
        }
        return updated
      })
    }
  }, [streamResponse, isStreaming]) // ✅ Only runs when streamResponse changes

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

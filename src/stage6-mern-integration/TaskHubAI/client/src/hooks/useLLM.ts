import { createContext, useContext } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMContextType {
  messages: Message[]
  loading: boolean
  clearChat: () => void
  isStreaming: boolean
  askQuestion: (prompt: string) => Promise<void>
  streamQuestion: (prompt: string) => Promise<void>
  stopStream: () => void
}

export const LLMContext = createContext<LLMContextType | undefined>(undefined)

export const useLLM = () => {
  const ctx = useContext(LLMContext)
  if (!ctx) throw new Error('useLLMContext must be used within LLMProvider')
  return ctx
}

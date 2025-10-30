import { useState } from 'react'
import { useLLM } from '../hooks'

export const ChatBox = () => {
  const [input, setInput] = useState('')
  const { messages, streamQuestion, isStreaming, loading } = useLLM()

  const handleSend = async () => {
    if (!input.trim()) return
    // Try streaming by default
    await streamQuestion(input)
    setInput('')
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
          disabled={loading || isStreaming}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading || isStreaming}
          onClick={handleSend}
        >
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useLLM } from '../hooks'

export const ChatBox = () => {
  const [input, setInput] = useState('')
  const { messages, streamQuestion, isStreaming, loading, stopStream } = useLLM()

  const handleSend = async () => {
    if (isStreaming) {
      stopStream()
      return
    }
    if (!input.trim()) return
    // Try streaming by default
    await streamQuestion(input)
    setInput('')
  }

  return (
    <div className="w-xl mx-auto mt-8 p-4 bg-indigo-100 rounded-2xl shadow">
      <h2 className="text-xl font-semibold text-center mb-4">🔗 Stream Chat Box [With Tools and Memory]</h2>

      <div className="border border-indigo-500 rounded-md p-3 h-80 overflow-y-auto bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-indigo-600' : 'text-gray-800'}>
            <strong>{msg.role}:</strong> <span>{msg.content}</span>
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
          className="bg-indigo-600 text-white px-4 py-2 rounded disabled:bg-gray-600"
          disabled={loading}
          onClick={handleSend}
        >
          {isStreaming ? 'Stop' : 'Ask'}
        </button>
      </div>
    </div>
  )
}

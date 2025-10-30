import { useState } from 'react'
import { useLLM } from '../hooks'

export const ChatDemo = () => {
  const { messages, askQuestion, clearChat, loading } = useLLM()
  const [input, setInput] = useState('')

  const handleSubmit = async () => {
    if (!input.trim()) return
    await askQuestion(input)
    setInput('')
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 p-4 bg-white rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-2 text-center">💬 Chat Demo</h2>

      <div className="h-64 overflow-y-auto border p-2 rounded-md bg-gray-50 mb-3">
        {messages.map((m, i) => (
          <p
            key={i}
            className={`mb-2 ${m.role === 'user' ? 'text-indigo-700 font-medium text-right' : 'text-gray-800'}`}
          >
            <b>{m.role === 'user' ? 'You:' : 'AI:'}</b> {m.content}
          </p>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
        />
        <button onClick={handleSubmit} disabled={loading} className="bg-blue-600 text-white px-4 rounded-lg">
          Send
        </button>
        <button onClick={clearChat} className="bg-gray-300 px-4 rounded-lg">
          Clear
        </button>
      </div>
    </div>
  )
}

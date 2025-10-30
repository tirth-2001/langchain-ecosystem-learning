import { useState } from 'react'
import { askLLM } from '../api/endpoints/ask.api'
import { handleApiError } from '../utils/errorHandler'

export const AskLLM = () => {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAsk = async () => {
    setLoading(true)
    setResponse('')
    try {
      const res = await askLLM(prompt)
      setResponse(res.output ?? '')
    } catch (err) {
      setResponse(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-8 p-4 bg-white rounded-2xl shadow">
      <h2 className="text-xl font-semibold text-center mb-4">📣 Ask LLM Test</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask something..."
        className="w-full border border-gray-300 rounded-lg p-2 mb-3 focus:ring focus:ring-blue-200"
        rows={3}
      />
      <button
        onClick={handleAsk}
        disabled={loading || !prompt}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 rounded-lg transition disabled:opacity-60"
      >
        {loading ? 'Asking...' : 'Send to LLM'}
      </button>

      {response && (
        <div className="mt-4 p-3 border-t border-gray-200 bg-gray-50 rounded-lg">
          <strong>Response:</strong>
          <p className="mt-1 text-gray-800 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  )
}

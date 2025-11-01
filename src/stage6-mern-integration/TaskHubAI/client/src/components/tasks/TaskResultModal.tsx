import { useEffect } from 'react'

interface TaskResultModalProps {
  open: boolean
  onClose: () => void
  title: string
  result?: string
  status: string
}

export const TaskResultModal = ({ open, onClose, title, result, status }: TaskResultModalProps) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            ✕
          </button>
        </div>
        <div className="border rounded p-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm font-mono">
          {status === 'failed' ? (
            <span className="text-red-600 font-semibold">{result || 'Task failed'}</span>
          ) : (
            <>{result || 'No result yet.'}</>
          )}
        </div>
      </div>
    </div>
  )
}

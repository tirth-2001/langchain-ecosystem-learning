// components/TaskList.tsx
import { useEffect, useRef, useState } from 'react'
import { TaskStatusBadge } from './TaskStatusBadge'
import { TaskResultModal } from './TaskResultModal'
import { useTasks } from '../../hooks'

export const TaskList = () => {
  const { tasks, loading, runExistingTask, deleteExistingTask } = useTasks()
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [modalTask, setModalTask] = useState<string | null>(null)

  const scrollRef = useRef<HTMLTableRowElement | null>(null)
  useEffect(() => {
    if (expandedTask && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [expandedTask])

  if (loading) return <p>Loading tasks...</p>

  return (
    <div className="p-4">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Title</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <>
              <tr key={t.id} className="border-t">
                <td className="p-2 font-medium">{t.title}</td>
                <td className="p-2">{t.description}</td>
                <td className="p-2">
                  <TaskStatusBadge status={t.status} />
                </td>
                <td className="p-2 space-x-2">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <button
                      className="px-3 py-1 bg-blue-500 text-white rounded"
                      disabled={t.status === 'running'}
                      onClick={() => runExistingTask(t.id)}
                    >
                      Run
                    </button>
                    <button
                      className="px-3 py-1 bg-red-500 text-white rounded"
                      onClick={() => deleteExistingTask(t.id)}
                    >
                      Delete
                    </button>
                    {(t.status === 'completed' || t.status === 'failed') && (
                      <button
                        className="px-3 py-1 bg-gray-600 text-white rounded"
                        onClick={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                      >
                        {expandedTask === t.id ? 'Hide' : 'View'} Result
                      </button>
                    )}
                  </div>
                </td>
              </tr>

              {expandedTask === t.id && (
                <tr className="bg-gray-50 border-t" ref={expandedTask === t.id ? scrollRef : null}>
                  <td colSpan={4} className="p-3">
                    <div className="border rounded p-3 text-sm font-mono whitespace-pre-wrap">
                      {t.result ? (
                        <>
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold">Result Output</span>
                            <button
                              className="text-blue-600 hover:underline text-xs"
                              onClick={() => setModalTask(t.id)}
                            >
                              Open in Modal
                            </button>
                          </div>
                          {t.status === 'failed' ? <span className="text-red-600">{t.result}</span> : <>{t.result}</>}
                        </>
                      ) : (
                        <span className="italic text-gray-500">No result available.</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      {modalTask && (
        <TaskResultModal
          open={!!modalTask}
          onClose={() => setModalTask(null)}
          title={tasks.find((t) => t.id === modalTask)?.title || ''}
          result={tasks.find((t) => t.id === modalTask)?.result}
          status={tasks.find((t) => t.id === modalTask)?.status || ''}
        />
      )}
    </div>
  )
}

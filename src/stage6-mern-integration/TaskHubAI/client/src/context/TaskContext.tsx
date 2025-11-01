import { useState, type ReactNode, useCallback } from 'react'
import { createTask, getAllTasks, runTask, deleteTask } from '../api/endpoints/tasks.api'
import { handleApiError } from '../utils/errorHandler'
import type { Task } from '../api/types'
import { TaskContext } from '../hooks'

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  console.log('rerendering')

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await getAllTasks()
      setTasks(res.data)
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const addTask = async (title: string, description: string) => {
    setLoading(true)
    try {
      const res = await createTask({ title, description })
      setTasks((prev) => [...prev, res.data])
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const runExistingTask = async (id: string) => {
    try {
      const res = await runTask(id)
      setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)))
    } catch (err) {
      setError(handleApiError(err))
    }
  }

  const deleteExistingTask = async (id: string) => {
    try {
      await deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(handleApiError(err))
    }
  }

  // Polling for status updates every 5 seconds
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const pollTasks = useCallback(() => {
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  // useEffect(() => {
  //   fetchTasks()
  //   const stopPolling = pollTasks()
  //   return stopPolling
  // }, [pollTasks])

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        fetchTasks,
        addTask,
        runExistingTask,
        deleteExistingTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}

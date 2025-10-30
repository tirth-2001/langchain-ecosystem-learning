import { useState, type ReactNode } from 'react'
import { createTask, getAllTasks } from '../api/endpoints/tasks.api'
import { handleApiError } from '../utils/errorHandler'
import type { Task } from '../api/types'
import { TaskContext } from '../hooks'

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return <TaskContext.Provider value={{ tasks, loading, error, fetchTasks, addTask }}>{children}</TaskContext.Provider>
}

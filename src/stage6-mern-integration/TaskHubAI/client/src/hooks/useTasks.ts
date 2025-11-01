import { createContext, useContext } from 'react'
import type { Task } from '../api/types'

interface TaskContextType {
  tasks: Task[]
  loading: boolean
  error: string | null
  fetchTasks: () => Promise<void>
  addTask: (title: string, description: string) => Promise<void>
  runExistingTask: (id: string) => Promise<void>
  deleteExistingTask: (id: string) => Promise<void>
}

export const TaskContext = createContext<TaskContextType | undefined>(undefined)

export const useTasks = () => {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider')
  return ctx
}

import { Task } from '../types/task'
import { v4 as uuid } from 'uuid'

const tasks: Task[] = []

export const createTask = (title: string, description?: string): Task => {
  const task: Task = {
    id: uuid(),
    title,
    description,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  tasks.push(task)
  return task
}

export const listTasks = () => tasks

export const getTask = (id: string) => tasks.find((t) => t.id === id)

export const updateTask = (id: string, updates: Partial<Task>) => {
  const idx = tasks.findIndex((t) => t.id === id)
  if (idx === -1) return null
  tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date() }
  return tasks[idx]
}

export const deleteTask = (id: string) => {
  const idx = tasks.findIndex((t) => t.id === id)
  if (idx === -1) return false
  tasks.splice(idx, 1)
  return true
}

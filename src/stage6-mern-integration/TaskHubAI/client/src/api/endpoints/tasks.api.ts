import apiClient from '../client'
import type { ApiResponse, Task } from '../types'

export const getAllTasks = async () => {
  const res = await apiClient.get<ApiResponse<Task[]>>('/tasks')
  return res.data
}

export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'status'>) => {
  const res = await apiClient.post<ApiResponse<Task>>('/tasks', task)
  return res.data
}

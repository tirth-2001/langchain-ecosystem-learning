export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  output?: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  createdAt: string
}

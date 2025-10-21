export interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: any
  createdAt: Date
  updatedAt: Date
}

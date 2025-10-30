import apiClient from '../client'
import type { ApiResponse } from '../types'

export const askLLM = async (prompt: string) => {
  const res = await apiClient.post<ApiResponse<{ output: string }>>('/langchain/test', { prompt })
  const d = res.data
  console.log('temp.1 d', d)
  return res.data
}

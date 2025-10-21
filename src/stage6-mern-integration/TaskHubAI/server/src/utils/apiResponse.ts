export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: any
}

export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  message,
  data,
})

export const errorResponse = (error: any, message?: string): ApiResponse => ({
  success: false,
  message,
  error: typeof error === 'string' ? error : error?.message || 'Unknown error',
})

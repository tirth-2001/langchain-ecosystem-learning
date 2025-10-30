import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// Create Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15s default
  headers: {
    'Content-Type': 'application/json',
  },
})

// Optional: Token injection (ready for 6.2.4)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message =
      error.response?.data && typeof error.response.data === 'object'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (error.response.data as any).message
        : error.message

    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  },
)

export default apiClient

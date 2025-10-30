const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const testBackend = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/health`)
    if (!res.ok) throw new Error(`Server returned ${res.status}`)
    const data = await res.json()
    return data
  } catch (err) {
    console.error('Backend connection failed:', err)
    throw err
  }
}

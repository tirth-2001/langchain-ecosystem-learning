import { useEffect, useState } from 'react'
import { testBackend } from '../api/backend'

export const HealthCheck = () => {
  const [status, setStatus] = useState('Checking...')
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const data = await testBackend()
        setStatus(`✅ Backend is live: ${data.status || 'OK'}`)
      } catch {
        setStatus('❌ Backend unreachable')
        setError('Check API URL or server status.')
      }
    })()
  }, [])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>🔗 Backend Connectivity Test</h2>
      <p>{status}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

import { HealthCheck, AskLLM, ChatDemo, ChatBox } from './components'
import { TaskPage } from './pages'

export default function App() {
  return (
    <div style={{ marginInline: 'auto', width: '100vw' }}>
      <h1 style={{ textAlign: 'center' }}>🚀 AI Task Hub Frontend</h1>
      <HealthCheck />
      <ChatDemo />
      <ChatBox />
      <TaskPage />
    </div>
  )
}

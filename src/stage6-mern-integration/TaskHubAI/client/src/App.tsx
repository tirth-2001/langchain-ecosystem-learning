import { AskLLM, ChatBox, ChatDemo, HealthCheck } from './components'

export default function App() {
  return (
    <div style={{ marginInline: 'auto', width: '100vw' }}>
      <h1 style={{ textAlign: 'center' }}>🚀 AI Task Hub Frontend</h1>
      <HealthCheck />
      <AskLLM />
      <ChatDemo />
      <ChatBox />
    </div>
  )
}

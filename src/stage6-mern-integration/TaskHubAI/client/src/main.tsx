import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { TaskProvider, LLMProvider } from './context/index.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TaskProvider>
      <LLMProvider>
        <App />
      </LLMProvider>
    </TaskProvider>
  </StrictMode>,
)

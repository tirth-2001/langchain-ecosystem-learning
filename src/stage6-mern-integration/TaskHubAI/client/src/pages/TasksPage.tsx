import { TaskManager } from '../components/tasks'
import { TaskProvider } from '../context/TaskContext'

export const TaskPage = () => (
  <TaskProvider>
    <TaskManager />
  </TaskProvider>
)

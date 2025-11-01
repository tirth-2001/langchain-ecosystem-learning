import { TaskForm } from './TaskForm'
import { TaskList } from './TaskList'

export const TaskManager = () => (
  <div className="p-4">
    <h1 className="text-xl font-bold text-center">Task Manager</h1>
    <TaskForm />
    <TaskList />
  </div>
)

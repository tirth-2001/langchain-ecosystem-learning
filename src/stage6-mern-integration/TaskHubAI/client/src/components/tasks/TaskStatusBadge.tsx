export const TaskStatusBadge = ({ status }: { status: string }) => {
  const color =
    status === 'completed'
      ? 'bg-green-200 text-green-800'
      : status === 'running'
      ? 'bg-yellow-200 text-yellow-800'
      : status === 'failed'
      ? 'bg-red-200 text-red-800'
      : 'bg-gray-200 text-gray-800'

  return <span className={`px-2 py-1 rounded text-sm font-medium ${color}`}>{status}</span>
}

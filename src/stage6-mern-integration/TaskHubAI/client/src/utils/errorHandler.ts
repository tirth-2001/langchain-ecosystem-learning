export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return 'Unknown API error occurred'
}

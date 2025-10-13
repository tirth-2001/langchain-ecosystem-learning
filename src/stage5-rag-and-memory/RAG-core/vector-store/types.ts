export interface VectorQueryResult {
  id: string
  score: number
  metadata: Record<string, any>
  text: string
}

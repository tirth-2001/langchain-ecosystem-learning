// utils/sessionStore.ts
// Lightweight session store (in-memory Map).
// Pattern: load session, mutate context, save session (stateless orchestration friendly).

type SessionData = {
  context: Record<string, any>
  createdAt: number
  updatedAt: number
}

const sessions = new Map<string, SessionData>()

export const sessionStore = {
  get: (sessionId: string): SessionData | null => {
    return sessions.get(sessionId) ?? null
  },

  set: (sessionId: string, data: Partial<SessionData>) => {
    const existing = sessions.get(sessionId) ?? { context: {}, createdAt: Date.now(), updatedAt: Date.now() }
    const merged = { ...existing, ...data, updatedAt: Date.now() }
    sessions.set(sessionId, merged)
  },

  withSession: async <T>(sessionId: string, runner: (session: SessionData) => Promise<T> | T): Promise<T> => {
    const current = sessions.get(sessionId) ?? { context: {}, createdAt: Date.now(), updatedAt: Date.now() }
    const result = await runner(current)
    sessions.set(sessionId, { ...current, updatedAt: Date.now() })
    return result
  },

  // convenience helper
  getContext: (sessionId: string) => sessions.get(sessionId)?.context ?? {},
}

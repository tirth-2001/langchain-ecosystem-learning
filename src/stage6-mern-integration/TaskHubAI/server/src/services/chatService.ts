import { ChatMessage, ChatSession, ChatSessionModel } from '../model'

/**
 * Find or create a chat session.
 */
export const findOrCreateSession = async (sessionId: string, userId?: string) => {
  let session = await ChatSession.findOne({ sessionId })
  if (!session) {
    session = await ChatSession.create({
      sessionId,
      userId: userId || 'anonymous',
      title: 'New Chat',
      lastMessageAt: new Date(),
    })
  }
  return session
}

/**
 * Save a message to MongoDB.
 */
export const saveMessage = async (session: ChatSessionModel, role: 'human' | 'ai', content: string) => {
  await ChatMessage.create({
    sessionId: session.sessionId,
    role,
    content,
  })

  await ChatSession.updateOne(
    { sessionId: session.sessionId },
    { lastMessageAt: new Date(), $inc: { messageCount: 1 } },
  )
}

/**
 * Get previous messages for memory hydration.
 */
export const getSessionMessages = async (sessionId: string) => {
  return ChatMessage.find({ sessionId }).sort({ createdAt: 1 }).lean()
}

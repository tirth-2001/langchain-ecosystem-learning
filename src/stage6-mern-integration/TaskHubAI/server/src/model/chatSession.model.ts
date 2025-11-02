import mongoose, { Document } from 'mongoose'

export interface ChatSessionModel extends Document {
  sessionId: string
  userId?: string
  title: string
  lastMessageAt: Date
  messageCount: number
}

const chatSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: String,
    title: String,
    lastMessageAt: Date,
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const ChatSession = mongoose.model<ChatSessionModel>('ChatSession', chatSessionSchema)

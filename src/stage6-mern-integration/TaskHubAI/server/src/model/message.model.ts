import mongoose, { Schema, Document } from 'mongoose'

export interface ChatMessageModel extends Document {
  sessionId: string
  role: 'human' | 'ai'
  content: string
}

const messageSchema = new Schema<ChatMessageModel>(
  {
    sessionId: { type: String, required: true }, // same string ID as in ChatSession
    role: { type: String, enum: ['human', 'ai'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export const ChatMessage = mongoose.model<ChatMessageModel>('ChatMessage', messageSchema)

import mongoose from 'mongoose'

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('Missing MONGODB_URI in environment variables')
    const connection = await mongoose.connect(uri, { dbName: 'chatbot' })
    console.log(`✅ MongoDB connected to DB: ${connection.connection.name ?? ''}`)
  } catch (err) {
    console.error('❌ MongoDB connection error:', (err as Error).message)
    process.exit(1)
  }
}

import dotenv from 'dotenv'
dotenv.config()

export const Config = {
  port: Number(process.env.PORT) ?? 8080,
  openAIApiKey: process.env.OPENAI_API_KEY ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
}

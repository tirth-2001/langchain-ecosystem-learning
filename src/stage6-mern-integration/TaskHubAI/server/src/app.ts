import { Config } from './config/env'
import express, { Application } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import morgan from 'morgan'
import routes from './routes'
import { errorHandler } from './middleware/errorHandler'
import { connectDB } from './config/db'

const app: Application = express()

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(morgan('dev'))

// API routes
app.use('/api', routes)

// Error handler (must be last)
app.use(errorHandler)

// Connect DB
connectDB()

// Server Listen
app.listen(Config.port, () => {
  console.log(`✅ Server running on port ${Config.port} | Environment: ${Config.nodeEnv}`)
})

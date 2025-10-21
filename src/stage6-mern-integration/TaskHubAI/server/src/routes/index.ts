import express from 'express'
import langchainRoutes from './langchain.routes'
import taskRoutes from './task.routes'

const router = express.Router()

router.use('/langchain', langchainRoutes)
router.use('/tasks', taskRoutes)
router.get('/health', (_, res) => res.json({ status: 'ok' }))

export default router

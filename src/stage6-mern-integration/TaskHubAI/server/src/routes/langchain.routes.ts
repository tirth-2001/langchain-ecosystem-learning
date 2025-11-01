import express from 'express'
import { askController, askControllerV2, runTaskAgentController, testLLM } from '../controllers/langchain.controller'
import { asyncHandler } from '../utils'

const router = express.Router()

router.post('/test', asyncHandler(testLLM))
router.post('/ask', asyncHandler(askController))
router.post('/v2/ask', asyncHandler(askControllerV2))
router.post('/task-agent', asyncHandler(runTaskAgentController))

export default router

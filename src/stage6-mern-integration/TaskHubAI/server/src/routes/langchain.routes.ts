import express from 'express'
import { askController, testLLM } from '../controllers/langchain.controller'

const router = express.Router()

router.post('/test', testLLM)
router.post('/ask', askController)

export default router

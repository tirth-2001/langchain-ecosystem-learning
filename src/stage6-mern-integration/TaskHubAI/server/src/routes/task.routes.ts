import { asyncHandler } from './../utils/asyncHandler'
import { Router } from 'express'
import { create, list, remove, run } from '../controllers/task.controller'

const router = Router()

router.get('/', asyncHandler(list))
router.post('/', asyncHandler(create))
router.post('/:id/run', asyncHandler(run))
router.delete('/:id', asyncHandler(remove))

export default router

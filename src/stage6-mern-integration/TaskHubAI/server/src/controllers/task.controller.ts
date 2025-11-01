import { Request, Response } from 'express'
import * as taskService from '../services/taskService'
import { runTaskChain } from '../langchainHelper/chains/taskChain'
import { errorResponse, successResponse } from '../utils'

export const create = async (req: Request, res: Response) => {
  const { title, description } = req.body
  const task = taskService.createTask(title, description)
  res.status(201).json(successResponse(task))
}

export const list = async (req: Request, res: Response) => {
  res.json(successResponse(taskService.listTasks()))
}

export const run = async (req: Request, res: Response) => {
  const { id } = req.params
  const task = taskService.getTask(id)
  if (!task) throw new Error('Task not found')

  try {
    taskService.updateTask(id, { status: 'running' })
    const output = await runTaskChain(task.description || '')
    taskService.updateTask(id, { status: 'completed', result: output })
    res.json(successResponse(taskService.getTask(id)))
  } catch (err: any) {
    taskService.updateTask(id, { status: 'failed', result: err.message })
    res.status(500).json(errorResponse(err.message))
  }
}

export const remove = async (req: Request, res: Response) => {
  const { id } = req.params
  taskService.deleteTask(id)
  res.status(204).end()
}

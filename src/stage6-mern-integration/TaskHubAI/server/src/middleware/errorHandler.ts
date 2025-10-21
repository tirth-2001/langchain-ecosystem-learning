import { Request, Response, NextFunction } from 'express'
import { errorResponse } from '../utils/apiResponse'

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🔥 Error:', err)

  const status = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(status).json(errorResponse(err, message))
}

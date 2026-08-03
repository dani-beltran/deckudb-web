import type { Request, Response } from 'express'
import logger from '../../utils/logger'
import { ConflictError } from '../errors/ConflictError'
import { NotFoundError } from '../errors/NotFoundError'
import { ValidationError } from '../errors/ValidationError'

export const createController = <T>(controllerFn: (req: Request, res: Response) => Promise<T>) => {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await controllerFn(req, res)
      if (!res.headersSent) {
        if (req.method === 'DELETE') {
          res.status(204).send()
        } else {
          res.json(result)
        }
      }
    } catch (error) {
      if (res.headersSent) {
        return
      }
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message })
        return
      }
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message, details: error.details })
        return
      }
      if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message })
        return
      }
      logger.error('Server error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

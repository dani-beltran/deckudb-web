import type { NextFunction, Request, Response } from 'express'
import { getBackendConfig } from '../../config'
import logger from '../../utils/logger'

const runtimeConfig = getBackendConfig()

export const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = runtimeConfig.jobApiKey

  if (!apiKey) {
    logger.error('JOB_API_KEY is not configured')
    res.status(500).json({ error: 'Internal server error' })
    return
  }

  const provided = req.headers['x-api-key']

  if (!provided || typeof provided !== 'string' || provided !== apiKey) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  next()
}

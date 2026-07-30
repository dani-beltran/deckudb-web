import express, { type Express } from 'express'
import { createGamesRouter } from './api/games/games.router'
import { createJobsRouter } from './api/jobs/jobs.router'
import { createSteamRouter } from './api/steam/steam.router'
import { NODE_ENV, NODE_ENVS } from './config/env'
import corsMiddleware from './middleware/cors'
import sessionMiddleware from './middleware/session'
import type { AppDependencies } from './types/dependencies'

export const createApp = (dependencies: AppDependencies): Express => {
  const app: Express = express()

  if (NODE_ENV === NODE_ENVS.PRODUCTION) {
    app.set('trust proxy', 1)
  }

  // Middleware
  app.use(corsMiddleware)
  app.use(express.json())
  app.use(sessionMiddleware)

  // Routes
  app.use('/api', createGamesRouter(dependencies))
  app.use('/api', createJobsRouter(dependencies))
  app.use('/api', createSteamRouter(dependencies))

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'API is running' })
  })

  return app
}

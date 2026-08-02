import express, { type Express } from 'express'
import { createGamesRouter } from './api/games/games.router'
import { createJobsRouter } from './api/jobs/jobs.router'
import { createSteamRouter } from './api/steam/steam.router'
import { getBackendConfig } from './config'
import corsMiddleware from './middleware/cors'
import sessionMiddleware from './middleware/session'
import type { AppDependencies } from './types/dependencies'

type CreateAppOptions = {
  apiPrefix?: string
}

export type ExpressApp = Express & {
  locals: {
    dependencies: AppDependencies
  }
}

/**
 * Creates an Express application with the provided dependencies and options.
 * Dependency injection is used to provide the necessary services and repositories to the application.
 * The dependencies are stored in the `app.locals.dependencies` property
 * @param dependencies The application dependencies.
 * @param params.apiPrefix The prefix for the API routes. Defaults to '/api'.
 * @returns The created Express application.
 */
export const createApp = (
  dependencies: AppDependencies,
  { apiPrefix = '/api' }: CreateAppOptions = {}
): ExpressApp => {
  const app: Express = express()
  const { nodeEnv } = getBackendConfig()

  app.locals.dependencies = dependencies;

  if (nodeEnv === 'production') {
    app.set('trust proxy', 1)
  }

  // Middleware
  app.use(corsMiddleware)
  app.use(express.json())
  app.use(sessionMiddleware)

  // Routes
  app.use(apiPrefix, createGamesRouter(dependencies))
  app.use(apiPrefix, createJobsRouter(dependencies))
  app.use(apiPrefix, createSteamRouter(dependencies))

  // Health check
  app.get(`${apiPrefix}/health`, (_req, res) => {
    res.json({ status: 'OK', message: 'API is running' })
  })

  return app as ExpressApp
}

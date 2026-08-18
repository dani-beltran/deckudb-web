import adminLoginHandler from '@server/api/admin/auth/login.post'
import adminLogoutHandler from '@server/api/admin/auth/logout.post'
import adminSessionHandler from '@server/api/admin/auth/session.get'
import gameSummaryVoteHandler from '@server/api/games/[id]/summary-vote.post'
import gameByIdHandler from '@server/api/games/[id].get'
import deleteJobHandler from '@server/api/jobs/[job_id].delete'
import jobsHandler from '@server/api/jobs/index.get'
import queueJobHandler from '@server/api/jobs/queue.post'
import steamGameByIdHandler from '@server/api/steam/games/[id].get'
import steamGamesBatchHandler from '@server/api/steam/games/batch.get'
import steamGamesHandler from '@server/api/steam/games/index.get'
import mostPlayedSteamDeckGamesHandler from '@server/api/steam/most-played-steam-deck-games.get'
import sessionMiddleware from '@server/middleware/session'
import type { ServerDependencies } from '@server/utils/bootstrap'
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3'

/**
 * Mount Nuxt API handlers on an H3 app.
 * Similar to production, the following middleware is applied:
 * - Database connection and dependency injection for API handlers.
 * - Session middleware for handling user sessions.
 * @returns An H3 NodeListener that can be used with Supertest for integration testing.
 */
export const createNuxtTestServer = (dependencies: ServerDependencies) => {
  const router = createRouter()
  router.get('/api/admin/auth/session', adminSessionHandler)
  router.post('/api/admin/auth/login', adminLoginHandler)
  router.post('/api/admin/auth/logout', adminLogoutHandler)
  router.get('/api/games/:id', gameByIdHandler)
  router.post('/api/games/:id/summary-vote', gameSummaryVoteHandler)
  router.delete('/api/jobs/:job_id', deleteJobHandler)
  router.get('/api/jobs', jobsHandler)
  router.post('/api/jobs/queue', queueJobHandler)
  router.get('/api/steam/games/batch', steamGamesBatchHandler)
  router.get('/api/steam/games/:id', steamGameByIdHandler)
  router.get('/api/steam/games', steamGamesHandler)
  router.get('/api/steam/most-played-steam-deck-games', mostPlayedSteamDeckGamesHandler)

  const app = createApp()
  app.use(
    defineEventHandler(async (event) => {
      event.context = {
        ...event.context,
        ...dependencies,
      }
    })
  )
  app.use(sessionMiddleware)
  app.use(router.handler)

  return toNodeListener(app)
}

import { createApp, createRouter, toNodeListener } from 'h3'
import type { Db } from 'mongodb'
import type { MongoMemoryServer } from 'mongodb-memory-server'
import sessionMiddleware from '../../middleware/session'
import gameSummaryVoteHandler from '../games/[id]/summary-vote.post'
import gameByIdHandler from '../games/[id].get'
import deleteJobHandler from '../jobs/[job_id].delete'
import jobsHandler from '../jobs/index.get'
import queueJobHandler from '../jobs/queue.post'
import steamGameByIdHandler from '../steam/games/[id].get'
import steamGamesBatchHandler from '../steam/games/batch.get'
import steamGamesHandler from '../steam/games/index.get'
import mostPlayedSteamDeckGamesHandler from '../steam/most-played-steam-deck-games.get'
import { createTestDb } from './test-db'

export type NuxtTestApp = {
  app: ReturnType<typeof toNodeListener>
  db: Db
  mongoServer: MongoMemoryServer
}

/**
 * Mounts the Nuxt API handlers on an H3 app backed by an in-memory MongoDB.
 * The handlers bootstrap their normal repositories using this database's URI.
 */
export const mountNuxtTestApp = async (): Promise<NuxtTestApp> => {
  const { db, mongoServer } = await createTestDb()
  process.env.NUXT_MONGODB_URI = mongoServer.getUri()
  process.env.NUXT_MONGODB_DATABASE = db.databaseName

  const router = createRouter()
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
  app.use(sessionMiddleware)
  app.use(router.handler)

  return { app: toNodeListener(app), db, mongoServer }
}

export const unmountNuxtTestApp = async ({ db, mongoServer }: NuxtTestApp) => {
  await db.dropDatabase()
  await db.client.close()
  await mongoServer.stop()
}

export const cacheSteamApp = async (db: Db, gameId: number, data: Record<string, unknown>) => {
  const now = new Date()
  await db.collection('steam_details_cache').insertOne({
    game_id: gameId,
    data,
    created_at: now,
    expires_at: new Date(now.getTime() + 60_000),
  })
}

import { getServerConfig } from '@server/config/index'
import type { GameReport } from '@server/models/game-reports.schema'
import { type Game, gameIdSchema } from '@server/models/games.schema'
import { JOB_TYPE } from '@server/models/jobs.schema'
import type { SteamApp } from '@server/services/steam/steam.types'
import { apiHandler, parseParams } from '@server/utils/api'
import { ConflictError } from '@server/utils/errors/ConflictError'
import logger from '@server/utils/logger'
import { defineEventHandler, type EventHandlerRequest, type H3Event } from 'h3'
import z from 'zod'

type GameStatus = 'queued' | 'invalid' | 'ready'

type GameResponseData = {
  steam_app: Partial<SteamApp>
  reports: GameReport[]
}

export type GameResponse = {
  status: GameStatus
  game: Partial<Game> & GameResponseData
}

export default defineEventHandler((event) =>
  apiHandler<GameResponse>(event, async () => {
    const { id: gameId } = await parseParams(event.context.params, z.object({ id: gameIdSchema }))
    const { repositories } = event.context
    const [game, steamApp] = await Promise.all([
      repositories.games.fetchGameById(gameId),
      repositories.steamCache.getGameDetails(gameId),
    ])
    let status: GameStatus = 'invalid'

    if (steamApp?.type === 'game') {
      status = 'queued'
      if (await isGameScrapeRequired(gameId, event)) {
        await queueGameScrape(gameId, steamApp.name, event)
      }
    }

    if (!game) return { status, game: { game_id: gameId, steam_app: steamApp, reports: [] } }

    const reports = await repositories.gameReports.fetchGameReportsByGameId(gameId)
    return { status: 'ready' as const, game: { ...game, reports, steam_app: steamApp } }
  })
)

const queueGameScrape = async (
  gameId: number,
  gameName: string,
  event: H3Event<EventHandlerRequest>
) => {
  try {
    await event.context.repositories.jobs.queueJob({
      job_type: JOB_TYPE.FULL,
      game_id: gameId,
      game_name: gameName,
    })
  } catch (error) {
    if (!(error instanceof ConflictError)) logger.error(`Error queueing game ${gameId}:`, error)
  }
}

const isGameScrapeRequired = async (gameId: number, event: H3Event<EventHandlerRequest>) => {
  const { repositories } = event.context
  const daysBetweenScrapes = getServerConfig().daysBetweenScrapes
  const olderThan = new Date(Date.now() - daysBetweenScrapes * 24 * 60 * 60 * 1000)
  const mostRecentJob = await repositories.jobs.getLastNotFailedJob(gameId, JOB_TYPE.FULL)

  return !mostRecentJob || new Date(mostRecentJob.updated_at) <= olderThan
}

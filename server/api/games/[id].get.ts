import { defineEventHandler } from 'h3'
import z from 'zod'
import { getServerConfig } from '../../config/index'
import { gameIdSchema } from '../../models/games.schema'
import { JOB_TYPE } from '../../models/jobs.model'
import { apiHandler, parseParams, useApiDependencies } from '../../utils/api'
import { ConflictError } from '../../utils/errors/ConflictError'
import logger from '../../utils/logger'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    const { id: gameId } = await parseParams(event.context.params, z.object({ id: gameIdSchema }))
    const { repositories } = await useApiDependencies()
    const [game, steamApp] = await Promise.all([
      repositories.games.fetchGameById(gameId),
      repositories.steamCache.getGameDetails(gameId),
    ])
    let status: 'queued' | 'ready' | 'invalid' = 'invalid'

    if (steamApp?.type === 'game') {
      if (await isGameScrapeRequired(gameId)) {
        await queueGameScrape(gameId, steamApp.name)
        status = 'queued'
      }
    }

    if (!game) return { status, game: { game_id: gameId, steam_app: steamApp, reports: [] } }

    const reports = await repositories.gameReports.fetchGameReportsByGameId(gameId)
    return { status: 'ready' as const, game: { ...game, reports, steam_app: steamApp } }
  })
)

const queueGameScrape = async (gameId: number, gameName: string) => {
  try {
    const { repositories } = await useApiDependencies()
    await repositories.jobs.queueJob({
      job_type: JOB_TYPE.FULL,
      game_id: gameId,
      game_name: gameName,
    })
  } catch (error) {
    if (!(error instanceof ConflictError)) logger.error(`Error queueing game ${gameId}:`, error)
  }
}

const isGameScrapeRequired = async (gameId: number) => {
  const { repositories } = await useApiDependencies()
  const daysBetweenScrapes = getServerConfig().daysBetweenScrapes
  const olderThan = new Date(Date.now() - daysBetweenScrapes * 24 * 60 * 60 * 1000)
  const mostRecentJob = await repositories.jobs.getLastNotFailedJob(gameId, JOB_TYPE.FULL)

  return !mostRecentJob || new Date(mostRecentJob.updated_at) <= olderThan
}

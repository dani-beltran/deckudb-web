import type { Request, Response } from 'express'
import { getBackendConfig } from '../../config'
import logger from '../../lib/logger'
import { ConflictError } from '../../errors/ConflictError'
import { createController } from '../../lib/controller-factory'
import type { SteamApp } from '../../services/steam/steam.types'
import type { AppDependencies } from '../../types/dependencies'
import { JOB_TYPE } from '../jobs/jobs.model'
import type { GameReport } from './game-reports.schema'
import type { GetGameByIdParams, VoteGameSummaryBody } from './games.router'
import type { Game } from './games.schema'

type GameResponse = {
  status: 'queued' | 'ready' | 'invalid'
  game: Partial<Game> & { reports: GameReport[] } & {
    steam_app: SteamApp | null
  }
}

export const createGamesControllers = ({ repositories }: AppDependencies) => {
  /**
   * Controller to get game details by ID. If the game exists in the database,
   * it returns the game details along with its reports and cached Steam details.
   * If the game doesn't exist, it returns the cached Steam details (if available)
   * and queues jobs to create the game and its reports, returning a "queued" status.
   */
  const getGameByIdRequestHandler = async (
    req: Request<unknown>,
    _res: Response
  ): Promise<GameResponse> => {
    const { id: gameId } = req.params as GetGameByIdParams
    const game = await repositories.games.fetchGameById(gameId)
    const steamApp = await repositories.steamCache.getGameDetails(gameId)
    const { daysBetweenScrapes } = getBackendConfig()
    const msBetweenScrapes = daysBetweenScrapes * 24 * 60 * 60 * 1000
    // Only re-queue if the last job was more than the configured days ago
    const olderThan = new Date(Date.now() - msBetweenScrapes)
    let status: 'queued' | 'ready' | 'invalid' = 'invalid'

    // Only queue jobs for actual games, skip other steam items like DLCs, software, etc.
    if (steamApp?.type === 'game') {
      // If the game never was processed or the last processing was a long time ago, queue the jobs to process it.
      await queueGameProcessingJob({ id: gameId, name: steamApp?.name }, JOB_TYPE.FULL, olderThan)
      status = 'queued'
    }

    if (!game) {
      return {
        status,
        game: {
          game_id: gameId,
          steam_app: steamApp,
          reports: [],
        },
      }
    }

    // Fetch game reports separately
    const reports = await repositories.gameReports.fetchGameReportsByGameId(gameId)
    status = 'ready'

    return {
      status,
      game: { ...game, reports, steam_app: steamApp },
    }
  }

  const queueGameProcessingJob = async (
    game: {
      id: number
      name?: string
    },
    jobType: JOB_TYPE,
    onlyOlderThan: Date
  ) => {
    try {
      // Only queue a job if there are no recent jobs of the same type
      // Failed jobs are retryable, so we ignore them when checking for recent activity
      const jobs = await repositories.jobs.getNotFailedJobs(game.id, jobType)
      const mostRecentJob = jobs.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0]

      if (mostRecentJob?.updated_at && new Date(mostRecentJob.updated_at) > onlyOlderThan) {
        logger.info(
          `Skipping re-queuing job ${jobType} for game: ${game.id} - ${game.name} because a recent job was queued or completed.`
        )
        return
      }

      const lastScrapeInfo = mostRecentJob?.updated_at
        ? `Last job update was at ${new Date(mostRecentJob.updated_at).toISOString()}`
        : 'No previous jobs found'
      logger.info(`Queueing job ${jobType} for game: ${game.id} - ${game.name}. ${lastScrapeInfo}.`)

      await repositories.jobs.queueJob({
        job_type: jobType,
        game_id: game.id,
        game_name: game.name,
      })
    } catch (error) {
      if (error instanceof ConflictError) {
        // Ignore conflict errors which indicate that the job is already queued or being processed
        return
      }
      logger.error(`Error re-queuing job ${jobType} for game: ${game.id} - ${game.name}: `, error)
    }
  }

  /**
   * Controller to handle voting on game performance summaries. It validates the incoming request,
   * records the vote, and returns a confirmation message. The vote type can be "up" or "down".
   */
  const voteGameSummaryRequestHandler = async (
    req: Request<unknown, unknown, VoteGameSummaryBody>,
    _res: Response
  ): Promise<{ message: string }> => {
    const { id } = req.params as GetGameByIdParams
    const { vote_type } = req.body

    await repositories.gameSummaryVotes.voteGamePerformanceSummary(id, req.session.id, vote_type)

    return { message: `Vote '${vote_type}' recorded for game ID ${id}` }
  }

  return {
    getGameByIdCtrl: createController(getGameByIdRequestHandler),
    voteGameSummaryCtrl: createController(voteGameSummaryRequestHandler),
  }
}

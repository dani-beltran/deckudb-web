import { getServerConfig } from '../config/index'
import { GameReportsModel } from '../models/game-reports.model'
import { GameSourcesModel } from '../models/game-sources.model'
import { GameSummaryVotesModel } from '../models/game-summary-votes.model'
import { GamesModel } from '../models/games.model'
import { JobsModel } from '../models/jobs.model'
import { ScrapesModel } from '../models/scrapes.model'
import { SteamCacheModel } from '../models/steam-cache.model'
import { DatabaseClient } from './DatabaseClient'
import logger from './logger'

export type ApiDependencies = {
  databaseClient: DatabaseClient,
  repositories: {
    gameSources: GameSourcesModel
    gameReports: GameReportsModel
    gameSummaryVotes: GameSummaryVotesModel
    games: GamesModel
    jobs: JobsModel
    scrapes: ScrapesModel
    steamCache: SteamCacheModel
  }
}

type BootstrapOptions = {
  dbConnectionName?: string
}

/**
 * Bootstraps the API dependencies, including database connection and repository instances.
 * This function is typically called during application startup to ensure that all necessary dependencies are initialized.
 * @returns Repositories and database client for use in API handlers.
 */
export const bootstrapDependencies = async (
  opts: BootstrapOptions = {}
): Promise<ApiDependencies> => {
  const config = getServerConfig()
  const databaseClient = new DatabaseClient({ ...opts, ...config })
  const db = await databaseClient.connect()
  return {
    databaseClient,
    repositories: {
      gameSources: new GameSourcesModel(db),
      gameReports: new GameReportsModel(db),
      gameSummaryVotes: new GameSummaryVotesModel(db),
      games: new GamesModel(db),
      jobs: new JobsModel(db),
      scrapes: new ScrapesModel(db),
      steamCache: new SteamCacheModel(db),
    },
  }
}

export const createDBIndexes = async ({
  repositories,
}: ApiDependencies) => {
  logger.info('Creating cache indexes...')
  await repositories.steamCache.createCacheIndexes()
  logger.info('Cache indexes created successfully')

  logger.info('Creating game indexes...')
  await repositories.games.createGameIndexes()
  logger.info('Game indexes created successfully')

  logger.info('Creating game report indexes...')
  await repositories.gameReports.createGameReportIndexes()
  logger.info('Game report indexes created successfully')

  logger.info('Creating job indexes...')
  await repositories.jobs.createJobIndexes()
  logger.info('Job indexes created successfully')

  logger.info('Creating scrape indexes...')
  await repositories.scrapes.createScrapeIndexes()
  logger.info('Scrape indexes created successfully')

  logger.info('Creating game source indexes...')
  await repositories.gameSources.createGameSourceIndexes()
  logger.info('Game source indexes created successfully')
}

import { GameSourcesModel } from '../api/game-sources/game-sources.model'
import { GameReportsModel } from '../api/games/game-reports.model'
import { GameSummaryVotesModel } from '../api/games/game-summary-votes.model'
import { GamesModel } from '../api/games/games.model'
import { JobsModel } from '../api/jobs/jobs.model'
import { ScrapesModel } from '../api/scrapes/scrapes.model'
import { SteamCacheModel } from '../api/steam/steam-cache.model'
import type { AppDependencies } from '../types/dependencies'
import { DatabaseClient } from './DatabaseClient'
import { getBackendConfig } from './index'
import logger from './logger'

export type BootstrappedDependencies = {
  databaseClient: DatabaseClient
  dependencies: AppDependencies
}

type BootstrapOptions = {
  dbConnectionName?: string
}

export const bootstrapDependencies = async (
  opts: BootstrapOptions = {}
): Promise<BootstrappedDependencies> => {
  const config = getBackendConfig()
  const databaseClient = new DatabaseClient({ ...opts, ...config })
  const db = await databaseClient.connect()
  const dependencies: AppDependencies = {
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

  return {
    databaseClient,
    dependencies,
  }
}

export const createDBIndexes = async ({
  repositories,
}: Awaited<ReturnType<typeof bootstrapDependencies>>['dependencies']) => {
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

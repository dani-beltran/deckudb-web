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

export type ServerDependencies = {
  databaseClient: DatabaseClient
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

declare module 'h3' {
  interface H3EventContext {
    databaseClient: ServerDependencies['databaseClient']
    repositories: ServerDependencies['repositories']
  }
}

type BootstrapOptions = {
  dbConnectionName?: string
}

export interface Repository {
  createIndexes(): Promise<void>
}

/**
 * Bootstraps the API dependencies, including database connection and repository instances.
 * This function is typically called during application startup to ensure that all necessary dependencies are initialized.
 * @returns Repositories and database client for use in API handlers.
 */
export const bootstrapDependencies = async (
  opts: BootstrapOptions = {}
): Promise<ServerDependencies> => {
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
    } satisfies Record<string, Repository>
  }
}

export const createDBIndexes = async ({ repositories }: ServerDependencies) => {
   for (const [name, repository] of Object.entries(repositories)) {
    logger.info(`Creating indexes for ${name}...`)
    await repository.createIndexes()
    logger.info(`Indexes for ${name} created successfully`)
  }
}

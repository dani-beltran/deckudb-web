import { GameSourcesModel } from '../../api/game-sources/game-sources.model'
import { GameReportsModel } from '../../api/games/game-reports.model'
import { GameSummaryVotesModel } from '../../api/games/game-summary-votes.model'
import { GamesModel } from '../../api/games/games.model'
import { JobsModel } from '../../api/jobs/jobs.model'
import { ScrapesModel } from '../../api/scrapes/scrapes.model'
import { SteamCacheModel } from '../../api/steam/steam-cache.model'
import { createApp } from '../../app'
import type { AppDependencies } from '../../types/dependencies'
import { getTestDB } from './test-db'

const createTestDependencies = (): AppDependencies => {
  const db = getTestDB()

  return {
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

/**
 * Creates the Express application configured for testing using
 * the test database. The test dependencies are accesible via `app.locals.dependencies`.
 * It does not use any API prefix for the routes, so they can be accessed at the root level.
 * @returns The created Express application for testing.
 */
export const createTestApp = () => createApp(createTestDependencies(), { apiPrefix: '' })

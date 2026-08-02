import type { Db } from 'mongodb'
import { GameSourcesModel } from '../../api/game-sources/game-sources.model'
import { GameReportsModel } from '../../api/games/game-reports.model'
import { GameSummaryVotesModel } from '../../api/games/game-summary-votes.model'
import { GamesModel } from '../../api/games/games.model'
import { JobsModel } from '../../api/jobs/jobs.model'
import { ScrapesModel } from '../../api/scrapes/scrapes.model'
import { SteamCacheModel } from '../../api/steam/steam-cache.model'
import type { AppDependencies } from '../../types/dependencies'

export const createTestDependencies = (db: Db): AppDependencies => {
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

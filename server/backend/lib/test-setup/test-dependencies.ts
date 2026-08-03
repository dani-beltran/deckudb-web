import type { Db } from 'mongodb'
import { GameReportsModel } from '../../../models/game-reports.model'
import { GameSourcesModel } from '../../../models/game-sources.model'
import { GameSummaryVotesModel } from '../../../models/game-summary-votes.model'
import { GamesModel } from '../../../models/games.model'
import { JobsModel } from '../../../models/jobs.model'
import { ScrapesModel } from '../../../models/scrapes.model'
import { SteamCacheModel } from '../../../models/steam-cache.model'
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

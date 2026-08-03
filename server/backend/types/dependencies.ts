import type { GameReportsModel } from '../../models/game-reports.model'
import type { GameSourcesModel } from '../../models/game-sources.model'
import type { GameSummaryVotesModel } from '../../models/game-summary-votes.model'
import type { GamesModel } from '../../models/games.model'
import type { JobsModel } from '../../models/jobs.model'
import type { ScrapesModel } from '../../models/scrapes.model'
import type { SteamCacheModel } from '../../models/steam-cache.model'

export type Repositories = {
  gameSources: GameSourcesModel
  gameReports: GameReportsModel
  gameSummaryVotes: GameSummaryVotesModel
  games: GamesModel
  jobs: JobsModel
  scrapes: ScrapesModel
  steamCache: SteamCacheModel
}

export type AppDependencies = {
  repositories: Repositories
}

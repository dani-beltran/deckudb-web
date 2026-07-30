import type { GameSourcesModel } from '../api/game-sources/game-sources.model'
import type { GameReportsModel } from '../api/games/game-reports.model'
import type { GameSummaryVotesModel } from '../api/games/game-summary-votes.model'
import type { GamesModel } from '../api/games/games.model'
import type { JobsModel } from '../api/jobs/jobs.model'
import type { ScrapesModel } from '../api/scrapes/scrapes.model'
import type { SteamCacheModel } from '../api/steam/steam-cache.model'

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

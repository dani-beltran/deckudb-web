import { getSourceFromUrl } from '../backend/api/game-sources/game-sources.model'
import {
  type GameSourceCreate,
  SCRAPE_SOURCES,
} from '../backend/api/game-sources/game-sources.schema'
import { JOB_TYPE, type Job } from '../backend/api/jobs/jobs.model'
import { getBackendConfig } from '../backend/config'
import logger from '../backend/lib/logger'
import type { MinerConstructor } from '../backend/lib/data-mining/Miner'
import { ProtondbMiner } from '../backend/lib/data-mining/ProtondbMiner'
import { SharedeckMiner } from '../backend/lib/data-mining/SharedeckMiner'
import { runJob } from '../backend/lib/job-runner'
import { FirecrawlService } from '../backend/services/firecrawl'
import type { AppDependencies } from '../backend/types/dependencies'

export const SEARCH_LIMIT = 10
const STATIC_SOURCES: { source: SCRAPE_SOURCES; miner: MinerConstructor }[] = [
  { source: SCRAPE_SOURCES.PROTONDB, miner: ProtondbMiner },
  { source: SCRAPE_SOURCES.SHAREDECK, miner: SharedeckMiner },
]
const STRICT_CASE_GAMES = ['REPLACED']

export async function searchGameSources(job: Job, { repositories }: AppDependencies) {
  const { firecrawlApiKey } = getBackendConfig()

  const gameId = job.game_id
  const steamApp = await repositories.steamCache.getGameDetails(gameId)
  const gameName = steamApp?.name

  if (!steamApp || !gameName || steamApp.type !== 'game') {
    throw new Error(
      `Job ${job.job_id} can't find game ID ${gameId} in steam or is not a game, required for search-sources.`
    )
  }

  logger.info(`Searching sources for game "${gameName}" (ID: ${gameId})...`)

  const query = `"${gameName}" game steam deck best settings`
  logger.debug(`FirecrawlMiner searching with query: ${query}`)

  const firecrawl = new FirecrawlService(firecrawlApiKey)
  const searchResults = await firecrawl.search({
    query,
    limit: SEARCH_LIMIT,
    lang: 'en',
    tbs: 'sbd:1',
  })

  logger.info(`Firecrawl found ${searchResults.length}/${SEARCH_LIMIT} results.`)
  logger.debug(
    `Firecrawl search results:\n${searchResults
      .map((r) => {
        return `${r.url}\n${r.title}\n${r.description}\n`
      })
      .join('\n\n')}`
  )

  const gameRegexFlags = STRICT_CASE_GAMES.includes(gameName) ? '' : 'i'
  const escapedGameName = gameName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const gameRegex = new RegExp(`(?<![\\w])${escapedGameName}(?![\\w])`, gameRegexFlags)
  const steamDeckRegex = /steam\s*deck/i

  const filteredResults = searchResults.filter((result) => {
    const text = `${result.title} ${result.description}`
    const isFromStaticSource = STATIC_SOURCES.some((source) => {
      const hostname = new URL(result.url).hostname
      return hostname.includes(source.source.toLowerCase())
    })
    return !isFromStaticSource && gameRegex.test(text) && steamDeckRegex.test(text)
  })

  logger.info(
    `Firecrawl filtered results to ${filteredResults.length}/${searchResults.length} pages`
  )
  logger.debug(
    `Firecrawl filtered results:\n${filteredResults
      .map((r) => {
        return `${r.url}`
      })
      .join('\n')}`
  )

  const allSources: GameSourceCreate[] = [
    ...STATIC_SOURCES.map((source) => {
      return {
        game_id: gameId,
        url: source.miner.getUrl(gameId),
        source: source.source,
        meta: {},
      }
    }),
    ...filteredResults.map((r) => ({
      game_id: gameId,
      url: r.url,
      source: getSourceFromUrl(r.url),
      meta: {
        title: r.title,
        description: r.description,
      },
    })),
  ]

  const { count } = await repositories.gameSources.saveGameSources(allSources)

  logger.info(
    `Search of game sources complete for "${gameName}": ${allSources.length} game sources found, ${count} new game sources saved.`
  )
  return []
}

export default defineTask({
  meta: {
    name: 'search-sources',
    description: 'Search sources for the next queued game source job',
  },
  async run() {
    try {
      await runJob(JOB_TYPE.SEARCH, searchGameSources)
      return { result: 'Source search job completed' }
    } catch (error) {
      logger.error(
        'Error running search-sources job:',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  },
})

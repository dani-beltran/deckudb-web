import {
  RedirectError,
  type ScrapeStructuredResult,
  SectionNotFoundError,
  SelectorTimeoutError,
} from '@danilidonbeltran/webscrapper/src/scraper.js'
import type { GameSource, SCRAPE_SOURCES } from '../models/game-sources.schema'
import { JOB_TYPE, type Job } from '../models/jobs.model'
import { buildMiner } from '../utils/data-mining/MinerFactory'
import { runJob } from '../utils/job-runner'
import logger from '../utils/logger'

import type { ApiDependencies } from '../utils/bootstrap'
export async function scrapeGameSources(job: Job, { repositories }: ApiDependencies) {
  const warnings: string[] = []
  const gameId = job.game_id
  const steamApp = await repositories.steamCache.getGameDetails(gameId)
  const gameName = steamApp?.name

  if (!steamApp || !gameName || steamApp.type !== 'game') {
    throw new Error(
      `Job ${job.job_id} can't find game ID ${gameId} in steam or is not a game, required for scrape-game.`
    )
  }

  logger.info(`Scraping game ${gameId}...`)

  // We retrieve all the sources that were already discovered for this game
  const gameSources = await repositories.gameSources.getGameSourcesByGameId(gameId)

  logger.info(
    `Found ${gameSources.length ?? 0} sources for game ${gameId}. Starting scraping process...`
  )

  if (!gameSources || gameSources.length === 0) {
    throw new Error(`No sources found for game ${gameId}.`)
  }

  // For each game source, we run the corresponding miner to scrape the data and save it.
  for (const entry of gameSources ?? []) {
    const miner = buildMiner(entry.source)
    let scraped: ScrapeStructuredResult | null = null

    if (!miner) {
      logger.info(
        `No miner available for source ${entry.source} with URL ${entry.url}. Fallback to store basic data.`
      )
      scraped = {
        title: entry.meta.title || '',
        url: entry.url,
        timestamp: Date.now().toString(),
      }
    } else {
      logger.info(
        `Using miner ${miner.constructor.name} to scrape data for game ${gameId} from URL ${entry.url}...`
      )
      scraped = await miner
        .scrape(entry.url)
        .catch((error) => handleScrapeError(error, entry, warnings))
        .finally(() => {
          miner.close()
        })
    }

    if (!scraped) {
      continue
    }

    logger.info(
      `Successfully scraped data for game ${job.game_id} from source ${entry.source}. Saving data...`
    )
    logger.debug('Scraped data:', scraped)

    await repositories.scrapes.saveScrapeData({
      game_id: job.game_id,
      source: entry.source,
      scraped_content: {
        ...scraped,
        // Add the title from the source entry as fallback
        title: scraped.title || entry.meta.title || '',
        // Add description with the ones from from the sources search.
        description: entry.meta.description || '',
      },
    })
  }
  logger.info(`Finished scraping all sources for game ${job.game_id}.`)
  return warnings
}

function handleScrapeError(error: unknown, entry: GameSource, warnings: string[]) {
  // Ignore section not found errors when is expected because there are no reports in the page and is explicitly indicated in the page.
  if (
    error instanceof SectionNotFoundError &&
    error.bodyText?.toLowerCase().includes('no reports')
  ) {
    logger.info(
      `No reports found for game ${entry.game_id} from source ${entry.source}, which is expected. Skipping...`
    )
    return null
  }
  const msg = getFormattedErrMsg(error, entry.game_id, entry.source)
  warnings.push(msg)
  logger.warn(msg)
  return null
}

function getFormattedErrMsg(error: unknown, gameId: number, source: SCRAPE_SOURCES) {
  if (error instanceof RedirectError) {
    return `Redirection ${error.status} to ${error.location} prevented while scraping game ${gameId} from source ${source}`
  }
  if (error instanceof SectionNotFoundError) {
    return `Section not found while scraping game ${gameId} from source ${source}: selectors ${JSON.stringify(
      error.selectors
    )}`
  }
  if (error instanceof SelectorTimeoutError) {
    return `Selector timeout while scraping game ${gameId} from source ${source} with url ${error.url}: selectors ${JSON.stringify(
      error.selectors
    )}`
  }
  return `Unexpected error in scrape process for game ${gameId} from source ${source}: ${error}`
}

export default defineTask({
  meta: {
    name: 'scrape-game',
    description: 'Scrape sources for the next queued game scrape job',
  },
  async run() {
    try {
      await runJob(JOB_TYPE.SCRAPE, scrapeGameSources)
      return { result: 'Game scrape job completed' }
    } catch (error) {
      logger.error(
        'Error running scrape-game job:',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  },
})

import { defineTask } from 'nitropack/runtime'
import { flatMapAsync } from '../../shared/async'
import { getFaviconUrl, getWebsiteApproximatePublishedDate } from '../../shared/web'
import type { GameReportBody } from '../models/game-reports.schema'
import { JOB_TYPE, type Job } from '../models/jobs.schema'
import { getSteamdeckVerificationStatus } from '../services/steam/steam'
import { STEAMDECK_VERIFICATION_STATUS } from '../services/steam/steam.types'
import type { ServerDependencies } from '../utils/bootstrap'
import { buildMiner } from '../utils/data-mining/MinerFactory'
import { ProtondbMiner } from '../utils/data-mining/ProtondbMiner'
import { SCRAPE_SOURCES, type Scrape } from '../utils/data-mining/scrapes.schema'
import { runJob } from '../utils/job-runner'
import logger from '../utils/logger'

export const generateGameReports = async (job: Job, { repositories }: ServerDependencies) => {
  const gameId = job.game_id
  const steamApp = await repositories.steamCache.getGameDetails(gameId)
  const gameName = steamApp?.name

  if (!steamApp || !gameName || steamApp.type !== 'game') {
    throw new Error(
      `Job ${job.job_id} can't find game ID ${gameId} in steam or is not a game, required for scrape-game.`
    )
  }

  logger.info(`Generating community reports for game ${gameId}...`)

  // Fetch the latest scraped data for the game from all sources
  const sources = Object.values(SCRAPE_SOURCES)
  const scrapes = await flatMapAsync(sources, (source) =>
    repositories.scrapes.getLastScrapedData(gameId, source)
  )

  if (scrapes.length === 0) {
    logger.error(`No scraped data found for game ${gameId}. Cannot generate game reports.`)
    throw new Error(`No scraped data found for game ${gameId}.`)
  }

  const { reports, warnings } = await getPolishedData(scrapes)

  if (warnings.length > 0) {
    logger.warn(...warnings)
  }
  logger.debug(`Polished data for game ${gameId}:`, reports)

  const [steamdeckVerificationStatus, steamdeckRating] = await Promise.all([
    getSteamdeckVerificationStatus(gameId),
    ProtondbMiner.getSteamdeckRating(gameId),
  ])

  if (!steamdeckRating) {
    logger.warn(
      `Could not fetch Steam Deck Proton rating for game ${gameId}. This field will be left empty.`
    )
  }

  await repositories.games.saveGame(gameId, {
    steamdeck_rating: steamdeckRating,
    steamdeck_verified: steamdeckVerificationStatus === STEAMDECK_VERIFICATION_STATUS.VERIFIED,
    steamdeck_verification_status: steamdeckVerificationStatus ?? undefined,
  })

  // Only replace reports if there are new reports to insert.
  // This prevents accidental deletion of existing reports when a source fails to provide new reports during rescraping.
  if (reports.length > 0) {
    await repositories.gameReports.replaceGameReportsForGame(gameId, reports)
  }

  logger.info(`Generated ${reports.length} reports for game ${gameId}.`)
  return warnings
}

const getPolishedData = async (scrapes: Scrape[]) => {
  const reports: GameReportBody[] = []
  const warnings: string[] = []

  for (const scrape of scrapes) {
    if (!scrape.scraped_content) {
      warnings.push(
        `Scrape data for game ${scrape.game_id} and source ${scrape.source} is missing scraped_content. Skipping.`
      )
      continue
    }

    const miner = buildMiner(scrape.source)

    if (!miner) {
      logger.info(
        `No miner available for source url ${scrape.scraped_content?.url}. Fallback to basic report.`
      )
      reports.push(createBasicReport(scrape))
      continue
    }

    try {
      const minerData = miner.polish(scrape.scraped_content)
      reports.push(...minerData.reports)

      if (!minerData.reports || minerData.reports.length === 0) {
        warnings.push(
          `Miner for source ${scrape.source} did not return any reports for game ${scrape.game_id}.`
        )
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      throw new Error(
        `Error polishing data for game ${scrape.game_id} and source ${scrape.source} with miner ${miner.constructor.name}: ${errMsg}`
      )
    } finally {
      miner.close()
    }
  }

  // If the posted_at field is missing in any report, try to get an approximate date
  logger.info(
    `Checking for missing posted_at fields in reports and attempting to fetch approximate dates from the Wayback Machine...`
  )
  const completeReports = await Promise.all(
    reports.map(async (r) => {
      if (!r.posted_at && r.source !== SCRAPE_SOURCES.SHAREDECK) {
        r.posted_at = await getWebsiteApproximatePublishedDate(r.url)
      }
      return r
    })
  )

  return {
    reports: completeReports,
    warnings,
  }
}

/**
 * Get a very basic report with minimum data.
 * This is used as a fallback when we don't have a specific miner for the source.
 * @param scrape
 * @returns
 */
const createBasicReport = (scrape: Scrape): GameReportBody => {
  let hostname = ''

  try {
    hostname = scrape.scraped_content?.url ? new URL(scrape.scraped_content.url).hostname : ''
  } catch (_) {
    throw new Error(
      `Invalid URL in scraped content for game ${scrape.game_id} and source ${scrape.source}: ${scrape.scraped_content?.url}.`
    )
  }

  return {
    source: scrape.source,
    title: scrape.scraped_content?.title || '',
    notes: scrape.scraped_content?.description || '',
    url: scrape.scraped_content?.url || '',
    posted_at: null,
    reporter: {
      username: hostname.replace(/^www\./, ''),
      user_profile_url: `https://${hostname}`,
      user_profile_avatar_url: getFaviconUrl(`https://${hostname}`, 256),
    },
  }
}

export default defineTask({
  meta: {
    name: 'generate-game-reports',
    description: 'Generate reports for the next queued game reports job',
  },
  async run() {
    try {
      await runJob(JOB_TYPE.REPORTS, generateGameReports)
      return { result: 'Game reports job completed' }
    } catch (error) {
      logger.error(
        'Error running generate-game-reports job:',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  },
})

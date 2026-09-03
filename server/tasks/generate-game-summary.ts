import { defineTask } from 'nitropack/runtime'
import type { GameReportBody } from '../models/game-reports.schema'
import { JOB_TYPE, type Job } from '../models/jobs.schema'
import { generateAIText } from '../services/ai'
import type { ServerDependencies } from '../utils/bootstrap'
import { SCRAPE_SOURCES } from '../utils/data-mining/scrapes.schema'
import { toError } from '../utils/errors/toError'
import { runJob } from '../utils/job-runner'
import logger from '../utils/logger'

export async function generateGameSummary(job: Job, { repositories }: ServerDependencies) {
  const warnings: string[] = []
  const gameId = job.game_id
  const steamApp = await repositories.steamCache.getGameDetails(gameId)
  const gameName = steamApp?.name

  if (!steamApp || !gameName || steamApp.type !== 'game') {
    throw new Error(
      `Job ${job.job_id} can't find game ID ${gameId} in steam or is not a game, required for scrape-game.`
    )
  }

  logger.info(`Generating game performance summary for game ${gameId}...`)
  const reports = await repositories.gameReports.fetchGameReportsByGameId(gameId)

  if (!reports || reports.length === 0) {
    throw new Error(`No game reports found for game ${gameId}.`)
  }

  const summary = await generateGameSummaryText(prepareSummaryInput(reports))

  await repositories.games.saveGame(gameId, {
    game_performance_summary: summary || undefined,
  })
  logger.info(`Game summary generated for game ${gameId}`)
  logger.debug(`Summary: ${summary}`)
  return warnings
}

function prepareSummaryInput(reports: GameReportBody[]) {
  const filteredReports = reports
    .filter((report) => {
      const text = `${report.title ?? ''} ${report.notes}`.trim()
      return (
        text?.length > 0 &&
        // We only include reports from sources created by users
        // and no media, and that we are confident are detailed and honest.
        (report.source === SCRAPE_SOURCES.PROTONDB || report.source === SCRAPE_SOURCES.SHAREDECK)
      )
    })
    .sort((a, b) => {
      const aTime = a.posted_at ? a.posted_at.getTime() : 0
      const bTime = b.posted_at ? b.posted_at.getTime() : 0
      return bTime - aTime
    })
  const res = filteredReports
    .map((report, index) => {
      return `Report ${index + 1}:\n${report.title}\n${report.notes}`
    })
    .join('\n\n')
  return res
}

async function generateGameSummaryText(raw?: string) {
  if (!raw) return ''
  const prompt = `Generate a concise summary (two to three sentences) of the following Steam Deck game's user reports, focusing on key points about performance, technical aspects and fixes or workarounds. 
Avoid personal opinions or extraneous details. Don't include the name of the game in the summary and don't provide a title for the summary.

Performance Reports
-------------------

${raw}

Summary:`
  const rawSummary = await askClaudeAI(prompt)
  // Clean up the summary
  const cleanedSummary = rawSummary
    .replace(/^Summary:\s*/i, '')
    .replace(/Summary\s/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^#/i, '')
    .trim()
  return cleanedSummary
}

async function askClaudeAI(msg: string) {
  if (!msg) return ''
  return generateAIText({
    prompt: msg,
    maxOutputTokens: 300,
    temperature: 0.3,
  })
}

export default defineTask({
  meta: {
    name: 'generate-game-summary',
    description: 'Generate a summary for the next queued game summary job',
  },
  async run() {
    try {
      await runJob(JOB_TYPE.SUMMARY, generateGameSummary)
      return { result: 'Game summary job completed' }
    } catch (error) {
      logger.error('Error running generate-game-summary job:', toError(error))
      throw error
    }
  },
})

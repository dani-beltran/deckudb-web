import { JOB_TYPE } from '../backend/api/jobs/jobs.model'
import logger from '../backend/config/logger'
import { runJob } from '../backend/lib/job-runner'
import { generateGameReports } from './generate-game-reports'
import { generateGameSummary } from './generate-game-summary'
import { scrapeGameSources } from './scrape-game'
import { searchGameSources } from './search-sources'

export default defineTask({
  meta: {
    name: 'full-process',
    description: 'Run the complete game processing pipeline for the next queued job',
  },
  async run() {
    try {
      await runJob(JOB_TYPE.FULL, async (job, dependencies) => [
        ...(await searchGameSources(job, dependencies)),
        ...(await scrapeGameSources(job, dependencies)),
        ...(await generateGameReports(job, dependencies)),
        ...(await generateGameSummary(job, dependencies)),
      ])
      return { result: 'Full-process job completed' }
    } catch (error) {
      logger.error(
        'Error running full-process job:',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  },
})

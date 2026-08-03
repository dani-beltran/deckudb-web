import { sleep, withTimeout } from '../../shared/async'
import { getTimeBetweenDates } from '../../shared/time'
import { bootstrapDependencies } from '../backend/lib/bootstrap'
import type { AppDependencies } from '../backend/types/dependencies'
import { getBackendConfig } from '../config'
import { JOB_STATUS, JOB_TYPE, type Job } from '../models/jobs.model'
import { generateGameReports } from '../tasks/generate-game-reports'
import { generateGameSummary } from '../tasks/generate-game-summary'
import { scrapeGameSources } from '../tasks/scrape-game'
import { searchGameSources } from '../tasks/search-sources'
import logger from '../utils/logger'

const MIN_POLL_INTERVAL_MS = 100
const MIN_IDLE_LOG_EVERY = 1
const config = getBackendConfig()
const {
  jobTimeoutMinutes,
  workerIdleLogEvery,
  workerPollIntervalMs,
  workerPollJitterMs,
  workerRequeueSweepMs,
} = config

export default defineNitroPlugin((nitroApp) => {
  if (!config.workerEnabled) {
    logger.info('Queue worker is disabled')
    return
  }

  const controller = new AbortController()

  const workerPromise = runQueueWorker(controller.signal).catch((error) => {
    logger.error('Queue worker stopped unexpectedly:', error)
  })

  nitroApp.hooks.hook('close', async () => {
    logger.info('Stopping queue worker...')
    controller.abort()
    await workerPromise
  })
})

async function runQueueWorker(signal: AbortSignal) {
  const boot = await bootstrapDependencies({ dbConnectionName: 'worker' })
  const deps = boot?.dependencies
  const databaseClient = boot?.databaseClient

  if (!deps) {
    throw new Error('Dependencies not initialized')
  }

  logger.info('Queue worker started')

  await runTimedOutSweep(deps)
  let nextSweepAt = Date.now() + workerRequeueSweepMs
  let idlePollCount = 0

  while (!signal.aborted) {
    try {
      if (Date.now() >= nextSweepAt) {
        await runTimedOutSweep(deps)
        nextSweepAt = Date.now() + workerRequeueSweepMs
      }

      const job = await deps.repositories.jobs.startNextQueuedJob('asc')
      if (!job) {
        idlePollCount += 1
        const idleLogEvery = Math.max(MIN_IDLE_LOG_EVERY, workerIdleLogEvery)
        if (idlePollCount % idleLogEvery === 0) {
          const queued = await deps.repositories.jobs.getQueuedJobsCount()
          logger.info(`Worker idle. Queued jobs: ${queued}`)
        }

        await sleep(getPollingDelayMs(), signal)
        continue
      }

      idlePollCount = 0
      await processJob(job, deps)
    } catch (error) {
      if (signal.aborted) {
        logger.info('Worker stopping due to signal abort')
        break
      }
      logger.error(
        'Error in worker iteration:',
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  await databaseClient?.disconnect()
  logger.info('Worker stopped gracefully')
}

async function processJob(job: Job, deps: AppDependencies) {
  const attemptCount = job.attempt_count ?? 1
  const maxAttempts = job.max_attempts ?? 3
  logger.info(
    `Picked job ${job.job_id} (${job.job_type}) for game ${job.game_id} - attempt ${attemptCount}/${maxAttempts}`
  )

  try {
    const warnings = await withTimeout(
      processJobByType(job, deps),
      jobTimeoutMinutes * 60 * 1000,
      `Job ${job.job_id} (${job.job_type}) exceeded ${jobTimeoutMinutes} minutes timeout`
    )
    job = await deps.repositories.jobs.completeJob(job.job_id, warnings.join('\n'))
    logger.info(`Job ${job.job_id} completed`)
    if (warnings.length > 0) {
      logger.warn(`Job ${job.job_id} completed with warnings -`, ...warnings)
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const finalMessage = `Attempt ${attemptCount}/${maxAttempts} failed: ${errMsg}`
    const status = await deps.repositories.jobs.failOrRequeueJob(job.job_id, finalMessage)
    if (status === JOB_STATUS.QUEUED) {
      logger.warn(`Job ${job.job_id} failed and was re-queued (${attemptCount}/${maxAttempts})`)
      return
    }
    logger.error(`Job ${job.job_id} failed permanently after retries`, errMsg)
  } finally {
    const timeTakenMs =
      job.completed_at && job.started_at
        ? getTimeBetweenDates(job.started_at, job.completed_at, 'seconds')
        : null
    logger.info(`Job ${job.job_id} took ${timeTakenMs ?? 'unknown'} seconds to process`)
  }
}

async function processJobByType(job: Job, deps: AppDependencies): Promise<string[]> {
  switch (job.job_type) {
    case JOB_TYPE.SEARCH:
      return searchGameSources(job, deps)
    case JOB_TYPE.SCRAPE:
      return scrapeGameSources(job, deps)
    case JOB_TYPE.REPORTS:
      return generateGameReports(job, deps)
    case JOB_TYPE.SUMMARY:
      return generateGameSummary(job, deps)
    case JOB_TYPE.FULL:
      return [
        ...(await searchGameSources(job, deps)),
        ...(await scrapeGameSources(job, deps)),
        ...(await generateGameReports(job, deps)),
        ...(await generateGameSummary(job, deps)),
      ]
    default: {
      const _exhaustiveCheck: never = job.job_type
      throw new Error(`Unsupported job type: ${job.job_type}`)
    }
  }
}

/**
 * This function finds jobs that have been in progress for too long (potentially stuck) and re-queues them to be picked up again.
 */
async function runTimedOutSweep({ repositories }: AppDependencies) {
  const result = await repositories.jobs.requeueTimedOutJobs(undefined, jobTimeoutMinutes)
  if (result.modifiedCount > 0) {
    logger.warn(`Re-queued ${result.modifiedCount} timed-out jobs`)
  }
}

function getPollingDelayMs() {
  const baseInterval = Math.max(MIN_POLL_INTERVAL_MS, workerPollIntervalMs)
  const jitterCap = Math.max(0, workerPollJitterMs)
  if (jitterCap === 0) {
    return baseInterval
  }
  const jitter = Math.floor(Math.random() * (jitterCap * 2 + 1)) - jitterCap
  return Math.max(MIN_POLL_INTERVAL_MS, baseInterval + jitter)
}

import type { NitroApp } from 'nitropack'
import { defineNitroPlugin } from 'nitropack/runtime'
import { sleep, withTimeout } from '../../shared/async'
import { getTimeBetweenDates } from '../../shared/time'
import { getServerConfig } from '../config'
import { JOB_STATUS, JOB_TYPE, type Job } from '../models/jobs.schema'
import { generateGameReports } from '../tasks/generate-game-reports'
import { generateGameSummary } from '../tasks/generate-game-summary'
import { scrapeGameSources } from '../tasks/scrape-game'
import { searchGameSources } from '../tasks/search-sources'
import type { ServerDependencies } from '../utils/bootstrap'
import { bootstrapDependencies } from '../utils/bootstrap'
import { toError } from '../utils/errors/toError'
import logger from '../utils/logger'

const MIN_POLL_INTERVAL_MS = 100
const config = getServerConfig()
const { jobTimeoutMinutes, workerPollIntervalMs, workerPollJitterMs, workerRequeueSweepMs } = config

/**
 * This plugin starts a background queue worker that processes jobs from the database.
 * The worker will continue running until the server is stopped or the plugin is disabled via configuration.
 * It handles job processing, re-queuing of timed-out jobs, and logging of worker activity.
 
 * The worker also implements a polling mechanism with jitter to avoid overwhelming the database with requests.
 * It logs once when it becomes idle, then stays quiet until it has started another job.
 */
export default defineNitroPlugin((nitroApp: NitroApp) => {
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
  const deps = await bootstrapDependencies({ dbConnectionName: 'worker' })
  const databaseClient = deps.databaseClient

  if (!deps || !databaseClient) {
    throw new Error('Dependencies not initialized')
  }

  logger.info('Queue worker started')

  await runTimedOutSweep(deps)
  let nextSweepAt = Date.now() + workerRequeueSweepMs
  let isIdle = false

  while (!signal.aborted) {
    try {
      if (Date.now() >= nextSweepAt) {
        await runTimedOutSweep(deps)
        nextSweepAt = Date.now() + workerRequeueSweepMs
      }

      const job = await deps.repositories.jobs.startNextQueuedJob('asc')
      if (!job) {
        if (!isIdle) {
          logger.info('Worker idle.')
          isIdle = true
        }

        await sleep(getPollingDelayMs(), signal)
        continue
      }

      isIdle = false
      await processJob(job, deps)
    } catch (error) {
      if (signal.aborted) {
        logger.info('Worker stopping due to signal abort')
        break
      }
      logger.error('Error in worker iteration:', toError(error))
    }
  }

  await databaseClient?.disconnect()
  logger.info('Worker stopped gracefully')
}

async function processJob(job: Job, deps: ServerDependencies) {
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
    logger.error(`Job ${job.job_id} failed permanently after retries`, toError(error))
  } finally {
    const timeTakenMs =
      job.completed_at && job.started_at
        ? getTimeBetweenDates(job.started_at, job.completed_at, 'seconds')
        : null
    logger.info(`Job ${job.job_id} took ${timeTakenMs ?? 'unknown'} seconds to process`)
  }
}

async function processJobByType(job: Job, deps: ServerDependencies): Promise<string[]> {
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
async function runTimedOutSweep({ repositories }: ServerDependencies) {
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

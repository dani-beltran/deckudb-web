import { getServerConfig } from '../config/index'
import type { JOB_TYPE, Job } from '../models/jobs.schema'
import type { ServerDependencies } from '../utils/bootstrap'
import { bootstrapDependencies } from './bootstrap'
import type { DatabaseClient } from './DatabaseClient'
import logger from './logger'

export const runJob = async (
  jobType: JOB_TYPE,
  executable: (job: Job, deps: ServerDependencies) => Promise<string[]>
) => {
  logger.info(`Running cron job ${jobType}...`)
  const startTime = Date.now()
  let job: Job | null = null
  let databaseClient: DatabaseClient | null = null
  let deps: ServerDependencies | null = null
  const { jobTimeoutMinutes } = getServerConfig()

  process.on('SIGINT', async () => {
    await gracefulShutdown(job, deps)
  })

  process.on('SIGTERM', async () => {
    await gracefulShutdown(job, deps)
  })

  try {
    deps = await bootstrapDependencies({
      dbConnectionName: `job-runner-${jobType}`,
    })
    databaseClient = deps.databaseClient

    // Re-queue any timed-out jobs before attempting to start a new one
    await deps.repositories.jobs.requeueTimedOutJobs(jobType, jobTimeoutMinutes)

    job = await deps.repositories.jobs.startQueuedJob(jobType)

    if (!job) {
      logger.info(`No ${jobType} jobs available in queue. Exiting...`)
      return
    }

    logger.info(`Processing ${jobType} job ${job.job_id} for game ID ${job.game_id}...`)
    const warnings: string[] = await executable(job, deps)

    await deps.repositories.jobs.completeJob(job.job_id, warnings.join('\n'))
    logger.info(`Job ${jobType} ${job.job_id} completed successfully.`)

    if (warnings.length > 0) {
      logger.warn(`Job ${jobType} ${job.job_id} completed with warnings - `, ...warnings)
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    if (deps && job) {
      await deps.repositories.jobs.failJob(job.job_id, errMsg)
      throw new Error(`Error running ${jobType} job ${job.job_id}: ${errMsg}`, { cause: error })
    } else {
      throw new Error(`Error running ${jobType} job: ${errMsg}`, { cause: error })
    }
  } finally {
    await databaseClient?.disconnect()
    logger.info(
      `Job ${jobType} ${job?.job_id} has ended. It took ${(Date.now() - startTime) / 1000} seconds.`
    )
  }
}

const gracefulShutdown = async (job: Job | null, deps: ServerDependencies | null) => {
  logger.info('Received shutdown signal. Gracefully shutting down...')

  if (job && deps) {
    await deps.repositories.jobs.failJob(job.job_id, 'Job interrupted by shutdown signal')
    logger.info(`Marked job ${job.job_id} as failed due to interruption.`)
  }

  await deps?.databaseClient?.disconnect()
  process.exit(0)
}

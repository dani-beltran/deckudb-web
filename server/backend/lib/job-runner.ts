import type { JOB_TYPE, Job } from '../api/jobs/jobs.model'
import { getBackendConfig } from '../config'
import { bootstrapDependencies } from '../lib/bootstrap'
import type { DatabaseClient } from '../lib/DatabaseClient'
import logger from '../lib/logger'
import type { AppDependencies } from '../types/dependencies'

export const runJob = async (
  jobType: JOB_TYPE,
  executable: (job: Job, deps: AppDependencies) => Promise<string[]>
) => {
  logger.info(`Running cron job ${jobType}...`)
  const startTime = Date.now()
  let job: Job | null = null
  let databaseClient: DatabaseClient | null = null
  let deps: AppDependencies | null = null
  const { jobTimeoutMinutes } = getBackendConfig()

  process.on('SIGINT', async () => {
    await gracefulShutdown(job, deps, databaseClient)
  })

  process.on('SIGTERM', async () => {
    await gracefulShutdown(job, deps, databaseClient)
  })

  try {
    const boot = await bootstrapDependencies({
      dbConnectionName: `job-runner-${jobType}`,
    })
    deps = boot.dependencies
    databaseClient = boot.databaseClient

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
      throw new Error(`Error running ${jobType} job ${job.job_id}: ${errMsg}`)
    } else {
      throw new Error(`Error running ${jobType} job: ${errMsg}`)
    }
  } finally {
    await databaseClient?.disconnect()
    logger.info(
      `Job ${jobType} ${job?.job_id} has ended. It took ${(Date.now() - startTime) / 1000} seconds.`
    )
  }
}

const gracefulShutdown = async (
  job: Job | null,
  deps: AppDependencies | null,
  databaseClient: DatabaseClient | null
) => {
  logger.info('Received shutdown signal. Gracefully shutting down...')

  if (job && deps) {
    await deps.repositories.jobs.failJob(job.job_id, 'Job interrupted by shutdown signal')
    logger.info(`Marked job ${job.job_id} as failed due to interruption.`)
  }

  await databaseClient?.disconnect()
  process.exit(0)
}

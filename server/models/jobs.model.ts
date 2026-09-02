import { randomUUID } from 'node:crypto'
import type { Collection, Db } from 'mongodb'
import { stripUndefined } from '../../shared/collection'
import { getServerConfig } from '../config/index'
import type { Sort } from '../types/mongo.types'
import { ConflictError } from '../utils/errors/ConflictError'
import type { PaginatedResult, PaginationParams } from '../utils/pagination'
import {
  type CreateJobParams,
  createJobSchema,
  JOB_STATUS,
  type JOB_TYPE,
  type Job,
} from './jobs.schema'

const jobMaxAttempts = getServerConfig().jobMaxAttempts

import type { Repository } from '../utils/bootstrap'

/**
 * The JobsModel class provides methods to manage background jobs in the database.
 *
 * They are intended to track and manage tasks like scraping game data or generating reports.
 */
export class JobsModel implements Repository {
  private collection: Collection<Job>

  constructor(private readonly db: Db) {
    this.collection = this.db.collection<Job>('jobs')
  }

  getJobById = async (job_id: string) => {
    return this.collection.findOne({ job_id })
  }

  /**
   * Fetches jobs from the database based on the provided filters, sort order, and pagination parameters.
   * Filters and sort parameters with undefined values will be ignored.
   */
  getJobs = async (
    filters: Partial<Pick<Job, 'job_type' | 'status' | 'game_id'>> = {},
    sort: Sort<Job> = { created_at: -1 },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Job>> => {
    const { page = 1, page_size = 20 } = pagination ?? {}
    const skip = (page - 1) * page_size
    const curatedFilters = stripUndefined(filters)
    const curatedSort: Sort<Job> = stripUndefined(sort)

    const [items, total] = await Promise.all([
      this.collection.find(curatedFilters).sort(curatedSort).skip(skip).limit(page_size).toArray(),
      this.collection.countDocuments(curatedFilters),
    ])

    return {
      items,
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    }
  }

  getLastNotFailedJob = async (game_id: number, jobType?: JOB_TYPE): Promise<Job | undefined> => {
    const filter = stripUndefined({
      game_id,
      job_type: jobType,
      status: { $ne: JOB_STATUS.FAILED },
    })
    const jobs = await this.collection.find(filter).sort({ updated_at: -1 }).limit(1).toArray()
    return jobs[0]
  }

  /**
   * Fetches paginated jobs filtered by game_id
   */
  getJobsByGameId = async (
    game_id: number,
    sort: Sort<Job> = { created_at: -1 },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Job>> => {
    return this.getJobs({ game_id }, sort, pagination)
  }

  /**
   * Fetches paginated jobs filtered by status
   */
  getJobsByStatus = async (
    status: JOB_STATUS,
    sort: Sort<Job> = { created_at: 1 },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Job>> => {
    return this.getJobs({ status }, sort, pagination)
  }

  /**
   * Fetches paginated jobs filtered by job_type
   */
  getJobsByType = async (
    job_type: JOB_TYPE,
    sort: Sort<Job> = { created_at: -1 },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Job>> => {
    return this.getJobs({ job_type }, sort, pagination)
  }

  /**
   * Queues a new job for processing
   */
  queueJob = async (jobParams: CreateJobParams): Promise<Job> => {
    const job = this.createJob(jobParams)
    const activeJobFilter = {
      job_type: jobParams.job_type,
      game_id: jobParams.game_id,
      status: { $in: [JOB_STATUS.QUEUED, JOB_STATUS.IN_PROGRESS] },
    }

    const results = await this.collection.updateOne(
      activeJobFilter,
      { $setOnInsert: job },
      { upsert: true }
    )

    if (!results.upsertedId) {
      throw new ConflictError(
        `A job of type ${jobParams.job_type} for game_id ${jobParams.game_id} is already in progress or queued.`
      )
    }
    return job
  }

  /**
   * Find a queued job and start it. It updates the job's status to IN_PROGRESS and records the start time.
   * Only jobs that are currently in the QUEUED status can be started.
   * @param jobType - The type of job to start (e.g., SCRAPE or GENERATE).
   * @param order - The order in which to select the job (asc for oldest first, desc for newest first). Default is asc.
   */
  startQueuedJob = async (
    jobType: JOB_TYPE,
    order: 'asc' | 'desc' = 'asc'
  ): Promise<Job | null> => {
    return this.startQueuedJobByFilter({ job_type: jobType }, order)
  }

  startNextQueuedJob = async (order: 'asc' | 'desc' = 'asc'): Promise<Job | null> => {
    return this.startQueuedJobByFilter({}, order)
  }

  /**
   * Mark a job as completed by setting its status to COMPLETED and recording the completion time.
   * Only jobs that are currently in the IN_PROGRESS status can be completed.
   * @param job_id - The unique identifier of the job to complete.
   * @throws Error if the job is not found or cannot be completed due to invalid status.
   */
  completeJob = async (job_id: string, statusMessage?: string) => {
    const utcNow = new Date(Date.now())

    const results = await this.collection.findOneAndUpdate(
      { job_id, status: JOB_STATUS.IN_PROGRESS },
      {
        $set: {
          status: JOB_STATUS.COMPLETED,
          status_message: statusMessage,
          completed_at: utcNow,
          updated_at: utcNow,
        },
      },
      { returnDocument: 'after' }
    )
    if (!results) {
      throw new Error(
        `Job with id ${job_id} not found or cannot be completed due to invalid status.`
      )
    }
    return results
  }

  /**
   * Mark a job as failed by setting its status to FAILED, recording the error message, and completion time.
   * Only jobs that are currently in the IN_PROGRESS status can be failed.
   * @param job_id - The unique identifier of the job to fail.
   * @param errorMessage - The error message describing why the job failed.
   * @throws Error if the job is not found or cannot be failed due to invalid status.
   */
  failJob = async (job_id: string, errorMessage: string) => {
    const utcNow = new Date(Date.now())

    const results = await this.collection.updateOne(
      { job_id, status: JOB_STATUS.IN_PROGRESS },
      {
        $set: {
          status: JOB_STATUS.FAILED,
          status_message: errorMessage,
          completed_at: utcNow,
          updated_at: utcNow,
        },
      }
    )
    if (results.matchedCount === 0) {
      throw new Error(`Job with id ${job_id} not found or cannot be failed due to invalid status.`)
    }
  }

  /**
   * Records a failure for the current attempt.
   * If attempts remain, the job is put back in QUEUED status.
   * Otherwise it is marked as FAILED permanently.
   */
  failOrRequeueJob = async (job_id: string, errorMessage: string) => {
    const job = await this.collection.findOne({
      job_id,
      status: JOB_STATUS.IN_PROGRESS,
    })
    if (!job) {
      throw new Error(`Job with id ${job_id} not found or cannot be failed due to invalid status.`)
    }

    const attempts = job.attempt_count ?? 1
    const maxAttempts = job.max_attempts ?? jobMaxAttempts

    if (attempts < maxAttempts) {
      const utcNow = new Date(Date.now())
      const result = await this.collection.updateOne(
        { job_id, status: JOB_STATUS.IN_PROGRESS },
        {
          $set: {
            status: JOB_STATUS.QUEUED,
            started_at: null,
            completed_at: null,
            status_message: errorMessage,
            updated_at: utcNow,
          },
        }
      )
      if (result.matchedCount === 0) {
        throw new Error(
          `Job with id ${job_id} not found or cannot be re-queued due to invalid status.`
        )
      }
      return JOB_STATUS.QUEUED
    }

    await this.failJob(job_id, errorMessage)
    return JOB_STATUS.FAILED
  }

  /**
   * Deletes a job from the database.
   * @param job_id - The unique identifier of the job to delete.
   * @returns The deleted job.
   */
  deleteJob = async (job_id: string): Promise<Job> => {
    const job = await this.collection.findOneAndDelete({
      job_id,
      status: { $ne: JOB_STATUS.IN_PROGRESS },
    })

    if (!job) {
      throw new ConflictError(
        `Job with id ${job_id} not found or cannot be deleted because it is in progress.`
      )
    }
    return job
  }

  /**
   * Inserts jobs directly into the database for testing purposes.
   * This bypasses any validation or business logic, so it should only
   * be used in test scenarios where you need to set up specific job states or conditions.
   */
  insertTestJobs = async (jobs: Job[]) => {
    await this.collection.insertMany(jobs)
  }

  /**
   * Re-queues jobs that have been in the IN_PROGRESS status for longer
   * than the specified maxMinutes.
   *
   * This can be used as a recovery mechanism to handle jobs that may have
   * been abandoned due to worker crashes or other issues.
   * @param jobType - The type of job to re-queue if it has timed out.
   * @param maxMinutes - The maximum number of minutes a job can be in the
   * IN_PROGRESS status before being re-queued.
   * @returns The result of the update operation.
   */
  requeueTimedOutJobs = async (jobType?: JOB_TYPE, maxMinutes = 60) => {
    const cutoff = new Date(Date.now() - maxMinutes * 60 * 1000)
    const filter = stripUndefined({
      status: JOB_STATUS.IN_PROGRESS,
      started_at: { $lt: cutoff },
      job_type: jobType,
    })

    return this.collection.updateMany(filter, {
      $set: {
        status: JOB_STATUS.QUEUED,
        started_at: null,
        completed_at: null,
        status_message: 'Job timed out and was re-queued',
        updated_at: new Date(),
      },
    })
  }

  getQueuedJobsCount = async () => {
    return this.collection.countDocuments({
      status: JOB_STATUS.QUEUED,
    })
  }

  createIndexes = async () => {
    // Create index on job_id for fast lookups
    await this.collection.createIndex({ job_id: 1 }, { unique: true })

    // Create compound index for game_id with created_at for sorting
    await this.collection.createIndex({ game_id: 1, created_at: -1 })

    // Create compound index for status with created_at for getting next job in queue
    await this.collection.createIndex({ status: 1, created_at: 1 })

    // Create compound index for job_type with created_at
    await this.collection.createIndex({ job_type: 1, created_at: -1 })

    // Create compound index for job_type and status for filtered queries
    await this.collection.createIndex({ job_type: 1, status: 1, created_at: 1 })
  }

  private createJob = (jobData: CreateJobParams): Job => {
    const validatedJob = createJobSchema.parse(jobData)
    const utcNow = new Date(Date.now())
    const job: Job = {
      job_id: randomUUID(),
      ...validatedJob,
      status: JOB_STATUS.QUEUED,
      attempt_count: 0,
      max_attempts: validatedJob.max_attempts ?? jobMaxAttempts,
      started_at: null,
      completed_at: null,
      created_at: utcNow,
      updated_at: utcNow,
    }
    return job
  }

  private startQueuedJobByFilter = async (
    filter: Partial<Pick<Job, 'job_type'>>,
    order: 'asc' | 'desc'
  ): Promise<Job | null> => {
    const utcNow = new Date(Date.now())
    const results = await this.collection.findOneAndUpdate(
      { ...filter, status: JOB_STATUS.QUEUED },
      [
        {
          $set: {
            status: JOB_STATUS.IN_PROGRESS,
            started_at: utcNow,
            updated_at: utcNow,
            attempt_count: {
              $add: [{ $ifNull: ['$attempt_count', 0] }, 1],
            },
            max_attempts: {
              $ifNull: ['$max_attempts', jobMaxAttempts],
            },
          },
        },
      ],
      {
        sort: { created_at: order === 'asc' ? 1 : -1 },
        returnDocument: 'after',
      }
    )
    return results
  }
}

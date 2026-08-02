import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestDb, flushDB, removeTestDb } from '../../lib/test-setup/test-db'
import {
  createJobSchema,
  JOB_STATUS,
  JOB_TYPE,
  type Job,
  JobsModel,
  jobSchema,
} from '../jobs/jobs.model'

let jobsModel: JobsModel
let testDb: Awaited<ReturnType<typeof createTestDb>>
const queueJob = (...args: Parameters<JobsModel['queueJob']>) => jobsModel.queueJob(...args)
const getJobById = (...args: Parameters<JobsModel['getJobById']>) => jobsModel.getJobById(...args)
const getJobsByGameId = (...args: Parameters<JobsModel['getJobsByGameId']>) =>
  jobsModel.getJobsByGameId(...args)
const getJobsByStatus = (...args: Parameters<JobsModel['getJobsByStatus']>) =>
  jobsModel.getJobsByStatus(...args)
const getJobsByType = (...args: Parameters<JobsModel['getJobsByType']>) =>
  jobsModel.getJobsByType(...args)
const startQueuedJob = (...args: Parameters<JobsModel['startQueuedJob']>) =>
  jobsModel.startQueuedJob(...args)
const startNextQueuedJob = (...args: Parameters<JobsModel['startNextQueuedJob']>) =>
  jobsModel.startNextQueuedJob(...args)
const completeJob = (...args: Parameters<JobsModel['completeJob']>) =>
  jobsModel.completeJob(...args)
const failJob = (...args: Parameters<JobsModel['failJob']>) => jobsModel.failJob(...args)
const failOrRequeueJob = (...args: Parameters<JobsModel['failOrRequeueJob']>) =>
  jobsModel.failOrRequeueJob(...args)
const getQueuedJobsCount = (...args: Parameters<JobsModel['getQueuedJobsCount']>) =>
  jobsModel.getQueuedJobsCount(...args)
const deleteJob = (...args: Parameters<JobsModel['deleteJob']>) => jobsModel.deleteJob(...args)
const insertTestJobs = (...args: Parameters<JobsModel['insertTestJobs']>) =>
  jobsModel.insertTestJobs(...args)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  job_id: 'test-job-id',
  job_type: JOB_TYPE.SCRAPE,
  game_id: 1,
  status: JOB_STATUS.QUEUED,
  attempt_count: 0,
  max_attempts: 3,
  started_at: null,
  completed_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
})

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('Job Model', () => {
  beforeAll(async () => {
    testDb = await createTestDb()
    jobsModel = new JobsModel(testDb.db)
  })

  afterAll(async () => {
    if (testDb) await removeTestDb(testDb.db, testDb.mongoServer)
  })

  afterEach(async () => {
    await flushDB(testDb.db)
  })

  // -------------------------------------------------------------------------
  // Schema validation
  // -------------------------------------------------------------------------

  describe('jobSchema', () => {
    it('should validate a complete, valid job object', () => {
      const job = makeJob()
      expect(() => jobSchema.parse(job)).not.toThrow()
    })

    it('should allow an optional status_message field', () => {
      const job = makeJob({ status_message: 'something went wrong' })
      const result = jobSchema.parse(job)
      expect(result.status_message).toBe('something went wrong')
    })

    it('should reject an invalid job_type', () => {
      const job = { ...makeJob(), job_type: 'invalid' }
      expect(() => jobSchema.parse(job)).toThrow()
    })

    it('should reject an invalid status', () => {
      const job = { ...makeJob(), status: 'unknown' }
      expect(() => jobSchema.parse(job)).toThrow()
    })

    it('should reject a non-positive game_id', () => {
      const job = { ...makeJob(), game_id: -1 }
      expect(() => jobSchema.parse(job)).toThrow()
    })
  })

  describe('createJobSchema', () => {
    it('should validate a valid create-job payload', () => {
      const payload = { job_type: JOB_TYPE.SCRAPE, game_id: 42 }
      expect(() => createJobSchema.parse(payload)).not.toThrow()
    })

    it('should reject missing job_type', () => {
      const payload = { game_id: 1 }
      expect(() => createJobSchema.parse(payload)).toThrow()
    })

    it('should reject missing game_id', () => {
      const payload = { job_type: JOB_TYPE.REPORTS }
      expect(() => createJobSchema.parse(payload)).toThrow()
    })

    it('should reject a non-integer game_id', () => {
      const payload = { job_type: JOB_TYPE.SCRAPE, game_id: 1.5 }
      expect(() => createJobSchema.parse(payload)).toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // queueJob
  // -------------------------------------------------------------------------

  describe('queueJob', () => {
    it('should create a job with QUEUED status and correct defaults', async () => {
      const job = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })

      expect(job.job_id).toBeDefined()
      expect(job.job_type).toBe(JOB_TYPE.SCRAPE)
      expect(job.game_id).toBe(1)
      expect(job.status).toBe(JOB_STATUS.QUEUED)
      expect(job.attempt_count).toBe(0)
      expect(job.max_attempts).toBe(3)
      expect(job.started_at).toBeNull()
      expect(job.completed_at).toBeNull()
      expect(job.created_at).toBeInstanceOf(Date)
      expect(job.updated_at).toBeInstanceOf(Date)
    })

    it('should persist the job in the database', async () => {
      const job = await queueJob({ job_type: JOB_TYPE.REPORTS, game_id: 99 })

      const stored = await getJobById(job.job_id)

      expect(stored).not.toBeNull()
      expect(stored?.game_id).toBe(99)
      expect(stored?.job_type).toBe(JOB_TYPE.REPORTS)
    })

    it('should assign a unique job_id for each created job', async () => {
      const jobA = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })
      const jobB = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 2 })

      expect(jobA.job_id).not.toBe(jobB.job_id)
    })

    it('should throw when given an invalid payload', async () => {
      await expect(queueJob({ job_type: 'bad' as JOB_TYPE, game_id: 1 })).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // getJobById
  // -------------------------------------------------------------------------

  describe('getJobById', () => {
    it('should return the correct job for a given job_id', async () => {
      const created = await queueJob({
        job_type: JOB_TYPE.SCRAPE,
        game_id: 5,
      })

      const found = await getJobById(created.job_id)

      expect(found).not.toBeNull()
      expect(found?.job_id).toBe(created.job_id)
      expect(found?.game_id).toBe(5)
    })

    it('should return null for a non-existent job_id', async () => {
      const result = await getJobById('does-not-exist')
      expect(result).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // getJobsByGameId
  // -------------------------------------------------------------------------

  describe('getJobsByGameId', () => {
    it('should return all jobs for a given game_id', async () => {
      await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 10 })
      await queueJob({ job_type: JOB_TYPE.REPORTS, game_id: 10 })
      await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 99 })

      const { items: jobs, total, page, page_size, total_pages } = await getJobsByGameId(10)

      expect(jobs).toHaveLength(2)
      expect(jobs.every((j) => j.game_id === 10)).toBe(true)
      expect(total).toBe(2)
      expect(page).toBe(1)
      expect(page_size).toBe(20)
      expect(total_pages).toBe(1)
    })

    it('should return an empty array when no jobs exist for a game_id', async () => {
      const { items: jobs, total } = await getJobsByGameId(404)
      expect(jobs).toEqual([])
      expect(total).toBe(0)
    })

    it('should default-sort results by created_at descending', async () => {
      const now = new Date()
      const earlier = new Date(now.getTime() - 10_000)

      const olderJob = makeJob({
        job_id: 'older',
        game_id: 20,
        created_at: earlier,
        updated_at: now,
      })
      const newerJob = makeJob({
        job_id: 'newer',
        game_id: 20,
        created_at: now,
        updated_at: now,
      })
      await insertTestJobs([olderJob, newerJob])

      const { items: jobs } = await getJobsByGameId(20)

      // Most recent first (default sort order descending)
      expect(jobs[0].job_id).toBe('newer')
      expect(jobs[1].job_id).toBe('older')
    })

    it('should respect a custom sort order', async () => {
      const now = new Date()
      const earlier = new Date(now.getTime() - 10_000)

      const olderJob = makeJob({
        job_id: 'older-21',
        game_id: 21,
        created_at: earlier,
        updated_at: earlier,
      })
      const newerJob = makeJob({
        job_id: 'newer-21',
        game_id: 21,
        created_at: now,
        updated_at: now,
      })

      await insertTestJobs([olderJob, newerJob])

      const { items: jobs } = await getJobsByGameId(21, { created_at: 1 })

      expect(jobs[0].job_id).toBe('older-21')
      expect(jobs[1].job_id).toBe('newer-21')
    })
  })

  // -------------------------------------------------------------------------
  // getJobsByStatus
  // -------------------------------------------------------------------------

  describe('getJobsByStatus', () => {
    it('should return only jobs with the requested status', async () => {
      const failed = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 4 })
      const completed = await queueJob({
        job_type: JOB_TYPE.SCRAPE,
        game_id: 3,
      })
      const inProgress = await queueJob({
        job_type: JOB_TYPE.SCRAPE,
        game_id: 2,
      })
      const queued = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })

      await startQueuedJob(JOB_TYPE.SCRAPE)
      await startQueuedJob(JOB_TYPE.SCRAPE)
      await startQueuedJob(JOB_TYPE.SCRAPE)
      await completeJob(completed.job_id)
      await failJob(failed.job_id, 'error')

      const [
        { items: queuedJobs },
        { items: inProgressJobs },
        { items: completedJobs },
        { items: failedJobs },
      ] = await Promise.all([
        getJobsByStatus(JOB_STATUS.QUEUED),
        getJobsByStatus(JOB_STATUS.IN_PROGRESS),
        getJobsByStatus(JOB_STATUS.COMPLETED),
        getJobsByStatus(JOB_STATUS.FAILED),
      ])

      expect(queuedJobs).toHaveLength(1)
      expect(queuedJobs[0].job_id).toBe(queued.job_id)

      expect(inProgressJobs).toHaveLength(1)
      expect(inProgressJobs[0].job_id).toBe(inProgress.job_id)

      expect(completedJobs).toHaveLength(1)
      expect(completedJobs[0].job_id).toBe(completed.job_id)

      expect(failedJobs).toHaveLength(1)
      expect(failedJobs[0].job_id).toBe(failed.job_id)
    })

    it('should return an empty array when no jobs match the status', async () => {
      const { items: jobs, total } = await getJobsByStatus(JOB_STATUS.COMPLETED)
      expect(jobs).toEqual([])
      expect(total).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // getJobsByType
  // -------------------------------------------------------------------------

  describe('getJobsByType', () => {
    it('should return only jobs with the requested job_type', async () => {
      await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })
      await queueJob({ job_type: JOB_TYPE.REPORTS, game_id: 2 })
      await queueJob({ job_type: JOB_TYPE.REPORTS, game_id: 3 })

      const { items: scrapeJobs } = await getJobsByType(JOB_TYPE.SCRAPE)
      const { items: generateJobs } = await getJobsByType(JOB_TYPE.REPORTS)

      expect(scrapeJobs).toHaveLength(1)
      expect(generateJobs).toHaveLength(2)
    })

    it('should return an empty array when no jobs match the type', async () => {
      const { items: jobs, total } = await getJobsByType(JOB_TYPE.REPORTS)
      expect(jobs).toEqual([])
      expect(total).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // startQueuedJob
  // -------------------------------------------------------------------------

  describe('startQueuedJob', () => {
    it('should transition a QUEUED job to IN_PROGRESS', async () => {
      const job = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })

      expect(job.status).toBe(JOB_STATUS.QUEUED)

      await startQueuedJob(JOB_TYPE.SCRAPE)

      const updated = await getJobById(job.job_id)
      expect(updated?.status).toBe(JOB_STATUS.IN_PROGRESS)
      expect(updated?.attempt_count).toBe(1)
      expect(updated?.started_at).toBeInstanceOf(Date)
      expect(updated?.updated_at.getTime()).toBeGreaterThanOrEqual(job.updated_at.getTime())
    })

    it('should not update a job that is not QUEUED', async () => {
      await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })
      await startQueuedJob(JOB_TYPE.SCRAPE) // move to IN_PROGRESS

      await expect(startQueuedJob(JOB_TYPE.SCRAPE)).resolves.toBeNull()
    })

    it('should return null when no jobs are available in the queue to start', async () => {
      await expect(startQueuedJob(JOB_TYPE.SCRAPE)).resolves.toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // startNextQueuedJob
  // -------------------------------------------------------------------------

  describe('startNextQueuedJob', () => {
    it('should pick the oldest queued job globally across all job types', async () => {
      const now = Date.now()
      await insertTestJobs([
        makeJob({
          job_id: 'newest',
          job_type: JOB_TYPE.REPORTS,
          created_at: new Date(now),
        }),
        makeJob({
          job_id: 'oldest',
          job_type: JOB_TYPE.SUMMARY,
          created_at: new Date(now - 10_000),
        }),
        makeJob({
          job_id: 'middle',
          job_type: JOB_TYPE.SCRAPE,
          created_at: new Date(now - 5_000),
        }),
      ])

      const started = await startNextQueuedJob('asc')
      expect(started?.job_id).toBe('oldest')
      expect(started?.status).toBe(JOB_STATUS.IN_PROGRESS)
      expect(started?.attempt_count).toBe(1)
    })

    it('should return null when there are no queued jobs', async () => {
      await expect(startNextQueuedJob('asc')).resolves.toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // completeJob
  // -------------------------------------------------------------------------

  describe('completeJob', () => {
    it('should transition an IN_PROGRESS job to COMPLETED', async () => {
      const job = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })
      await startQueuedJob(JOB_TYPE.SCRAPE)

      await completeJob(job.job_id)

      const updated = await getJobById(job.job_id)
      expect(updated?.status).toBe(JOB_STATUS.COMPLETED)
      expect(updated?.completed_at).toBeInstanceOf(Date)
    })

    it('should not update a job that is not IN_PROGRESS', async () => {
      const job = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })

      // Job is still QUEUED — completeJob should not modify it
      await expect(completeJob(job.job_id)).rejects.toThrow(
        `Job with id ${job.job_id} not found or cannot be completed due to invalid status.`
      )
    })

    it('should throw an error for a non-existent job', async () => {
      await expect(completeJob('ghost-id')).rejects.toThrow(
        `Job with id ghost-id not found or cannot be completed due to invalid status.`
      )
    })
  })

  // -------------------------------------------------------------------------
  // failJob
  // -------------------------------------------------------------------------

  describe('failJob', () => {
    it('should transition an IN_PROGRESS job to FAILED with an error message', async () => {
      const job = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })
      await startQueuedJob(JOB_TYPE.SCRAPE)

      await failJob(job.job_id, 'network timeout')

      const updated = await getJobById(job.job_id)
      expect(updated?.status).toBe(JOB_STATUS.FAILED)
      expect(updated?.status_message).toBe('network timeout')
      expect(updated?.completed_at).toBeInstanceOf(Date)
    })

    it('should not update a job that is not IN_PROGRESS', async () => {
      const job = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })

      await expect(failJob(job.job_id, 'error')).rejects.toThrow(
        `Job with id ${job.job_id} not found or cannot be failed due to invalid status.`
      )
    })

    it('should throw an error for a non-existent job', async () => {
      await expect(failJob('ghost-id', 'error')).rejects.toThrow(
        `Job with id ghost-id not found or cannot be failed due to invalid status.`
      )
    })
  })

  // -------------------------------------------------------------------------
  // failOrRequeueJob
  // -------------------------------------------------------------------------

  describe('failOrRequeueJob', () => {
    it('should re-queue when attempts are still available', async () => {
      const job = await queueJob({
        job_type: JOB_TYPE.SCRAPE,
        game_id: 10,
        max_attempts: 3,
      })
      await startQueuedJob(JOB_TYPE.SCRAPE)

      const status = await failOrRequeueJob(job.job_id, 'first failure')
      const updated = await getJobById(job.job_id)

      expect(status).toBe(JOB_STATUS.QUEUED)
      expect(updated?.status).toBe(JOB_STATUS.QUEUED)
      expect(updated?.attempt_count).toBe(1)
      expect(updated?.started_at).toBeNull()
      expect(updated?.completed_at).toBeNull()
    })

    it('should fail permanently when max attempts are exhausted', async () => {
      const job = await queueJob({
        job_type: JOB_TYPE.SCRAPE,
        game_id: 11,
        max_attempts: 1,
      })
      await startQueuedJob(JOB_TYPE.SCRAPE)

      const status = await failOrRequeueJob(job.job_id, 'final failure')
      const updated = await getJobById(job.job_id)

      expect(status).toBe(JOB_STATUS.FAILED)
      expect(updated?.status).toBe(JOB_STATUS.FAILED)
      expect(updated?.completed_at).toBeInstanceOf(Date)
    })
  })

  describe('getQueuedJobsCount', () => {
    it('should count only queued jobs', async () => {
      await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })
      await queueJob({ job_type: JOB_TYPE.REPORTS, game_id: 2 })
      await queueJob({ job_type: JOB_TYPE.SUMMARY, game_id: 3 })
      await startQueuedJob(JOB_TYPE.SUMMARY)

      const queued = await getQueuedJobsCount()
      expect(queued).toBe(2)
    })
  })

  // -------------------------------------------------------------------------
  // deleteJob
  // -------------------------------------------------------------------------

  describe('deleteJob', () => {
    it('should remove the job from the itemsbase', async () => {
      const job = await queueJob({ job_type: JOB_TYPE.SCRAPE, game_id: 1 })

      await expect(deleteJob(job.job_id)).resolves.not.toThrow()

      const found = await getJobById(job.job_id)
      expect(found).toBeNull()
    })
  })
})

import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuntimeConfig } from '#imports'
import { mountTestApp, type TestApp, unmountTestApp } from '../../lib/test-setup/test-app'
import { flushDB } from '../../lib/test-setup/test-db'
import * as steamService from '../../services/steam/steam.js'
import type { SteamApp } from '../../services/steam/steam.types'
import type { AppDependencies } from '../../types/dependencies'
import { JOB_STATUS, JOB_TYPE, type Job } from '../jobs/jobs.model'

const TEST_API_KEY = useRuntimeConfig().jobApiKey

// Mock steam service to avoid external API calls in queue tests
vi.mock('../../services/steam/steam', () => ({
  getSteamGameDetails: vi.fn(),
}))

let app: TestApp
let jobModel: AppDependencies['repositories']['jobs']

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  job_id: randomUUID(),
  job_type: JOB_TYPE.SCRAPE,
  game_id: 1,
  status: JOB_STATUS.QUEUED,
  started_at: null,
  completed_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
})

describe('GET /jobs', () => {
  beforeAll(async () => {
    app = await mountTestApp()
    jobModel = app.locals.dependencies.repositories.jobs
  })

  beforeEach(async () => {
    vi.mocked(steamService.getSteamGameDetails).mockResolvedValue({
      name: 'Mocked Steam Game',
    } as SteamApp)
  })

  afterAll(async () => {
    if (app) await unmountTestApp(app)
  })

  afterEach(async () => {
    await flushDB(app.locals.db)
  })

  describe('Successful scenarios', () => {
    it('should return all jobs with default pagination when no filters are provided', async () => {
      // Arrange
      await jobModel.insertTestJobs([
        makeJob({ job_id: 'job-1', game_id: 1 }),
        makeJob({ job_id: 'job-2', game_id: 2 }),
        makeJob({ job_id: 'job-3', game_id: 3 }),
      ])

      // Act
      const response = await request(app)
        .get('/jobs')
        .set('x-api-key', TEST_API_KEY)
        .expect('Content-Type', /json/)
        .expect(200)

      // Assert
      expect(response.body.items).toHaveLength(3)
      expect(response.body.total).toBe(3)
      expect(response.body.page).toBe(1)
      expect(response.body.page_size).toBe(20)
      expect(response.body.total_pages).toBe(1)
    })

    it('should return empty data when no jobs exist', async () => {
      // Act
      const response = await request(app).get('/jobs').set('x-api-key', TEST_API_KEY).expect(200)

      // Assert
      expect(response.body.items).toEqual([])
      expect(response.body.total).toBe(0)
      expect(response.body.total_pages).toBe(0)
    })

    it('should filter jobs by status', async () => {
      // Arrange
      await jobModel.insertTestJobs([
        makeJob({ job_id: 'job-1', status: JOB_STATUS.QUEUED }),
        makeJob({ job_id: 'job-2', status: JOB_STATUS.COMPLETED }),
        makeJob({ job_id: 'job-3', status: JOB_STATUS.FAILED }),
        makeJob({ job_id: 'job-4', status: JOB_STATUS.COMPLETED }),
      ])

      // Act
      const response = await request(app)
        .get('/jobs?status=completed')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items).toHaveLength(2)
      expect(response.body.total).toBe(2)
      for (const job of response.body.items) {
        expect(job.status).toBe(JOB_STATUS.COMPLETED)
      }
    })

    it('should filter jobs by job_type', async () => {
      // Arrange
      await jobModel.insertTestJobs([
        makeJob({ job_id: 'job-1', job_type: JOB_TYPE.SCRAPE }),
        makeJob({ job_id: 'job-2', job_type: JOB_TYPE.REPORTS }),
        makeJob({ job_id: 'job-3', job_type: JOB_TYPE.SCRAPE }),
      ])

      // Act
      const response = await request(app)
        .get('/jobs?job_type=scrape')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items).toHaveLength(2)
      for (const job of response.body.items) {
        expect(job.job_type).toBe(JOB_TYPE.SCRAPE)
      }
    })

    it('should filter jobs by game_id', async () => {
      // Arrange
      await jobModel.insertTestJobs([
        makeJob({ job_id: 'job-1', game_id: 100 }),
        makeJob({ job_id: 'job-2', game_id: 200 }),
        makeJob({ job_id: 'job-3', game_id: 100 }),
      ])

      // Act
      const response = await request(app)
        .get('/jobs?game_id=100')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items).toHaveLength(2)
      for (const job of response.body.items) {
        expect(job.game_id).toBe(100)
      }
    })

    it('should combine multiple filters', async () => {
      // Arrange
      await jobModel.insertTestJobs([
        makeJob({
          job_id: 'job-1',
          game_id: 1,
          status: JOB_STATUS.COMPLETED,
          job_type: JOB_TYPE.SCRAPE,
        }),
        makeJob({
          job_id: 'job-2',
          game_id: 1,
          status: JOB_STATUS.QUEUED,
          job_type: JOB_TYPE.SCRAPE,
        }),
        makeJob({
          job_id: 'job-3',
          game_id: 2,
          status: JOB_STATUS.COMPLETED,
          job_type: JOB_TYPE.SCRAPE,
        }),
        makeJob({
          job_id: 'job-4',
          game_id: 1,
          status: JOB_STATUS.COMPLETED,
          job_type: JOB_TYPE.REPORTS,
        }),
      ])

      // Act
      const response = await request(app)
        .get('/jobs?game_id=1&status=completed&job_type=scrape')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].job_id).toBe('job-1')
    })

    it('should respect page and page size pagination', async () => {
      // Arrange
      const jobs = Array.from({ length: 10 }, (_, i) =>
        makeJob({ job_id: `job-${i + 1}`, game_id: i + 1 })
      )
      await jobModel.insertTestJobs(jobs)

      // Act
      const response = await request(app)
        .get('/jobs?page=2&page_size=3')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items).toHaveLength(3)
      expect(response.body.page).toBe(2)
      expect(response.body.page_size).toBe(3)
      expect(response.body.total).toBe(10)
      expect(response.body.total_pages).toBe(4)
    })

    it('should return correct total_pages for partial last page', async () => {
      // Arrange
      const jobs = Array.from({ length: 7 }, (_, i) => makeJob({ job_id: `job-${i + 1}` }))
      await jobModel.insertTestJobs(jobs)

      // Act
      const response = await request(app)
        .get('/jobs?page_size=3')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.total).toBe(7)
      expect(response.body.total_pages).toBe(3)
    })

    it('should sort by created_at descending by default', async () => {
      // Arrange
      const now = Date.now()
      await jobModel.insertTestJobs([
        makeJob({ job_id: 'job-old', created_at: new Date(now - 2000) }),
        makeJob({ job_id: 'job-mid', created_at: new Date(now - 1000) }),
        makeJob({ job_id: 'job-new', created_at: new Date(now) }),
      ])

      // Act
      const response = await request(app).get('/jobs').set('x-api-key', TEST_API_KEY).expect(200)

      // Assert
      expect(response.body.items[0].job_id).toBe('job-new')
      expect(response.body.items[2].job_id).toBe('job-old')
    })

    it('should sort ascending when sort_order=asc', async () => {
      // Arrange
      const now = Date.now()
      await jobModel.insertTestJobs([
        makeJob({ job_id: 'job-old', created_at: new Date(now - 2000) }),
        makeJob({ job_id: 'job-mid', created_at: new Date(now - 1000) }),
        makeJob({ job_id: 'job-new', created_at: new Date(now) }),
      ])

      // Act
      const response = await request(app)
        .get('/jobs?sort_order=asc')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items[0].job_id).toBe('job-old')
      expect(response.body.items[2].job_id).toBe('job-new')
    })

    it('should return correct job fields', async () => {
      // Arrange
      const job = makeJob({
        job_id: 'job-check-fields',
        job_type: JOB_TYPE.REPORTS,
        game_id: 42,
        game_name: 'Test Game',
        status: JOB_STATUS.IN_PROGRESS,
        started_at: new Date(),
      })
      await jobModel.insertTestJobs([job])

      // Act
      const response = await request(app).get('/jobs').set('x-api-key', TEST_API_KEY).expect(200)

      // Assert
      expect(response.body.items[0]).toMatchObject({
        job_id: 'job-check-fields',
        job_type: JOB_TYPE.REPORTS,
        game_id: 42,
        game_name: 'Test Game',
        status: JOB_STATUS.IN_PROGRESS,
      })
      expect(response.body.items[0]).toHaveProperty('started_at')
      expect(response.body.items[0]).toHaveProperty('created_at')
      expect(response.body.items[0]).toHaveProperty('updated_at')
    })
  })

  describe('Error scenarios', () => {
    it('should return 401 when the api key is missing', async () => {
      // Act
      const response = await request(app).get('/jobs').expect('Content-Type', /json/).expect(401)

      // Assert
      expect(response.body).toHaveProperty('error')
    })

    it('should return 401 when the api key is wrong', async () => {
      // Act
      const response = await request(app)
        .get('/jobs')
        .set('x-api-key', 'wrong_api_key')
        .expect('Content-Type', /json/)
        .expect(401)

      // Assert
      expect(response.body).toHaveProperty('error')
    })

    it('should return 500 when the database query fails', async () => {
      // Arrange
      vi.spyOn(jobModel, 'getJobs').mockRejectedValueOnce(new Error('Database connection failed'))

      // Act
      const response = await request(app)
        .get('/jobs')
        .set('x-api-key', TEST_API_KEY)
        .expect('Content-Type', /json/)
        .expect(500)

      // Assert
      expect(response.body).toEqual({ error: 'Internal server error' })

      vi.restoreAllMocks()
    })

    it('should return 400 for an invalid status value', async () => {
      // Act
      const response = await request(app)
        .get('/jobs?status=invalid_status')
        .set('x-api-key', TEST_API_KEY)
        .expect('Content-Type', /json/)
        .expect(400)

      // Assert
      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for an invalid job_type value', async () => {
      // Act
      const response = await request(app)
        .get('/jobs?job_type=invalid_type')
        .set('x-api-key', TEST_API_KEY)
        .expect('Content-Type', /json/)
        .expect(400)

      // Assert
      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for a non-numeric game_id', async () => {
      // Act
      const response = await request(app)
        .get('/jobs?game_id=abc')
        .set('x-api-key', TEST_API_KEY)
        .expect('Content-Type', /json/)
        .expect(400)

      // Assert
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('Edge cases', () => {
    it('should handle page_size=1 returning a single item per page', async () => {
      // Arrange
      await jobModel.insertTestJobs([makeJob({ job_id: 'job-1' }), makeJob({ job_id: 'job-2' })])

      // Act
      const response = await request(app)
        .get('/jobs?page_size=1&page=1')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items).toHaveLength(1)
      expect(response.body.total_pages).toBe(2)
    })

    it('should return empty data for a page beyond total_pages', async () => {
      // Arrange
      await jobModel.insertTestJobs([makeJob({ job_id: 'job-1' })])

      // Act
      const response = await request(app)
        .get('/jobs?page=999')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items).toEqual([])
      expect(response.body.total).toBe(1)
    })

    it('should cap page_size at 100', async () => {
      // Arrange
      const jobs = Array.from({ length: 5 }, (_, i) => makeJob({ job_id: `job-${i + 1}` }))
      await jobModel.insertTestJobs(jobs)

      // Act — page_size over max is rejected (400 from schema validation)
      const response = await request(app)
        .get('/jobs?page_size=101')
        .set('x-api-key', TEST_API_KEY)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should filter correctly when all jobs match no filter criteria', async () => {
      // Arrange
      await jobModel.insertTestJobs([
        makeJob({ job_id: 'job-1', status: JOB_STATUS.QUEUED }),
        makeJob({ job_id: 'job-2', status: JOB_STATUS.QUEUED }),
      ])

      // Act
      const response = await request(app)
        .get('/jobs?status=completed')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      // Assert
      expect(response.body.items).toEqual([])
      expect(response.body.total).toBe(0)
    })
  })
})

describe('POST /jobs/queue', () => {
  beforeAll(async () => {
    app = await mountTestApp()
    jobModel = app.locals.dependencies.repositories.jobs
  })

  beforeEach(async () => {
    vi.mocked(steamService.getSteamGameDetails).mockResolvedValue({
      name: 'Mocked Steam Game',
    } as SteamApp)
  })

  afterAll(async () => {
    if (app) await unmountTestApp(app)
  })

  afterEach(async () => {
    await flushDB(app.locals.db)
  })

  describe('Successful scenarios', () => {
    it('should queue a job with game_id and job_type', async () => {
      const response = await request(app)
        .post('/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 123, job_type: JOB_TYPE.SCRAPE })
        .expect('Content-Type', /json/)
        .expect(201)

      // Assert response body
      expect(response.body).toMatchObject({
        status: 'queued',
        game_id: 123,
        job_type: JOB_TYPE.SCRAPE,
      })
      expect(response.body).toHaveProperty('job_id')

      // Verify the job was actually inserted into the database
      const queuedJob = await jobModel.getJobById(response.body.job_id)
      expect(queuedJob).toMatchObject({
        game_id: 123,
        job_type: JOB_TYPE.SCRAPE,
      })
      expect(queuedJob?.created_at).toBeInstanceOf(Date)
    })

    it('should not duplicate queue entries for the same game and job type', async () => {
      await request(app)
        .post('/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 456, job_type: JOB_TYPE.REPORTS })
        .expect(201)

      await request(app)
        .post('/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 456, job_type: JOB_TYPE.REPORTS })
        .expect(409)
    })
  })

  describe('Error scenarios', () => {
    it('should return 401 when the api key is missing', async () => {
      const response = await request(app)
        .post('/jobs/queue')
        .send({ game_id: 100, job_type: JOB_TYPE.SCRAPE })
        .expect('Content-Type', /json/)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for invalid job_type', async () => {
      const response = await request(app)
        .post('/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 100, job_type: 'invalid_type' })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for non-numeric game_id', async () => {
      const response = await request(app)
        .post('/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 'abc', job_type: JOB_TYPE.SCRAPE })
        .expect('Content-Type', /json/)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 500 when queue insertion fails', async () => {
      vi.spyOn(jobModel, 'queueJob').mockRejectedValueOnce(new Error('Queue insertion failed'))

      const response = await request(app)
        .post('/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 100, job_type: JOB_TYPE.SCRAPE })
        .expect('Content-Type', /json/)
        .expect(500)

      expect(response.body).toEqual({ error: 'Internal server error' })

      vi.restoreAllMocks()
    })
  })
})

describe('DELETE /jobs/:job_id', () => {
  beforeAll(async () => {
    app = await mountTestApp()
    jobModel = app.locals.dependencies.repositories.jobs
  })

  beforeEach(async () => {
  })

  afterAll(async () => {
    if (app) await unmountTestApp(app)
  })

  afterEach(async () => {
    await flushDB(app.locals.db)
  })

  describe('Successful scenarios', () => {
    it('should delete an existing job', async () => {
      const job_uuid = randomUUID()
      await jobModel.insertTestJobs([makeJob({ job_id: job_uuid })])

      await request(app).delete(`/jobs/${job_uuid}`).set('x-api-key', TEST_API_KEY).expect(204)

      const deleted = await jobModel.getJobById(job_uuid)
      expect(deleted).toBeNull()
    })

    it('should return 409 even when the job does not exist', async () => {
      const nonExistentJobUuid = randomUUID()
      await request(app)
        .delete(`/jobs/${nonExistentJobUuid}`)
        .set('x-api-key', TEST_API_KEY)
        .expect(409)
    })

    it('should return 409 when trying to delete an in-progress job', async () => {
      const job_uuid = randomUUID()
      await jobModel.insertTestJobs([makeJob({ job_id: job_uuid, status: JOB_STATUS.IN_PROGRESS })])

      const response = await request(app)
        .delete(`/jobs/${job_uuid}`)
        .set('x-api-key', TEST_API_KEY)
        .expect('Content-Type', /json/)
        .expect(409)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('Error scenarios', () => {
    it('should return 401 when the api key is missing', async () => {
      const response = await request(app)
        .delete('/jobs/job-to-delete')
        .expect('Content-Type', /json/)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 401 when the api key is wrong', async () => {
      const response = await request(app)
        .delete('/jobs/job-to-delete')
        .set('x-api-key', 'wrong_api_key')
        .expect('Content-Type', /json/)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 500 when delete job fails', async () => {
      const job_uuid = randomUUID()
      vi.spyOn(jobModel, 'deleteJob').mockRejectedValueOnce(new Error('Failed to delete job'))

      const response = await request(app)
        .delete(`/jobs/${job_uuid}`)
        .set('x-api-key', TEST_API_KEY)
        .expect('Content-Type', /json/)
        .expect(500)

      expect(response.body).toEqual({ error: 'Internal server error' })

      vi.restoreAllMocks()
    })
  })
})

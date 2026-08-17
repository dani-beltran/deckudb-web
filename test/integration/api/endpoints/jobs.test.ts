import { randomUUID } from 'node:crypto'
import { JOB_STATUS, JOB_TYPE, type Job } from '@server/models/jobs.schema'
import * as steamService from '@server/services/steam/steam'
import type { SteamApp } from '@server/services/steam/steam.types'
import { bootstrapDependencies, type ServerDependencies } from '@server/utils/bootstrap'
import type { NodeListener } from 'h3'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNuxtTestServer } from '../test-server'

const TEST_API_KEY = process.env.JOB_API_KEY ?? 'your_job_api_key_here'

const makeJob = (overrides: Partial<Job> = {}): Job => {
  const now = new Date()
  return {
    job_id: randomUUID(),
    job_type: JOB_TYPE.SCRAPE,
    game_id: 1,
    game_name: 'Test game',
    status: JOB_STATUS.QUEUED,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

describe('jobs API', () => {
  let testServer: NodeListener
  let dependencies: ServerDependencies

  beforeAll(async () => {
    dependencies = await bootstrapDependencies({
      dbConnectionName: 'test-jobs-api',
      mongodbDatabase: 'deckudb-api-jobs',
    })
    testServer = createNuxtTestServer(dependencies)
  })

  beforeEach(() => {
    vi.mocked(steamService.getSteamGameDetails).mockImplementation(
      async (gameId) =>
        ({
          steam_appid: gameId,
          name: `Mocked Steam Game ${gameId}`,
          type: 'game',
        }) as SteamApp
    )
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await dependencies.databaseClient.flushDB()
  })

  afterAll(async () => {
    await dependencies.databaseClient.disconnect()
  })

  describe('GET /api/jobs', () => {
    it('returns all jobs with default pagination', async () => {
      await dependencies.repositories.jobs.insertTestJobs([
        makeJob({ job_id: 'job-1', game_id: 1 }),
        makeJob({ job_id: 'job-2', game_id: 2 }),
        makeJob({ job_id: 'job-3', game_id: 3 }),
      ])

      const response = await request(testServer)
        .get('/api/jobs')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      expect(response.body).toMatchObject({ total: 3, page: 1, page_size: 20, total_pages: 1 })
      expect(response.body.items).toHaveLength(3)
    })

    it('returns an empty page when no jobs exist', async () => {
      const response = await request(testServer)
        .get('/api/jobs')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      expect(response.body).toMatchObject({ items: [], total: 0, total_pages: 0 })
    })

    it.each([
      ['status', JOB_STATUS.COMPLETED],
      ['job_type', JOB_TYPE.REPORTS],
      ['game_id', '100'],
    ])('filters jobs by %s', async (filter, value) => {
      await dependencies.repositories.jobs.insertTestJobs([
        makeJob({
          job_id: 'match-1',
          game_id: 100,
          status: JOB_STATUS.COMPLETED,
          job_type: JOB_TYPE.REPORTS,
        }),
        makeJob({
          job_id: 'match-2',
          game_id: 100,
          status: JOB_STATUS.COMPLETED,
          job_type: JOB_TYPE.REPORTS,
        }),
        makeJob({
          job_id: 'other',
          game_id: 200,
          status: JOB_STATUS.FAILED,
          job_type: JOB_TYPE.SCRAPE,
        }),
      ])

      const response = await request(testServer)
        .get(`/api/jobs?${filter}=${value}`)
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      expect(response.body.total).toBe(2)
      expect(response.body.items).toHaveLength(2)
    })

    it('combines multiple filters', async () => {
      await dependencies.repositories.jobs.insertTestJobs([
        makeJob({
          job_id: 'match',
          game_id: 1,
          status: JOB_STATUS.COMPLETED,
          job_type: JOB_TYPE.SCRAPE,
        }),
        makeJob({
          job_id: 'wrong-status',
          game_id: 1,
          status: JOB_STATUS.QUEUED,
          job_type: JOB_TYPE.SCRAPE,
        }),
        makeJob({
          job_id: 'wrong-game',
          game_id: 2,
          status: JOB_STATUS.COMPLETED,
          job_type: JOB_TYPE.SCRAPE,
        }),
        makeJob({
          job_id: 'wrong-type',
          game_id: 1,
          status: JOB_STATUS.COMPLETED,
          job_type: JOB_TYPE.REPORTS,
        }),
      ])

      const response = await request(testServer)
        .get('/api/jobs?game_id=1&status=completed&job_type=scrape')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      expect(response.body.items).toEqual([expect.objectContaining({ job_id: 'match' })])
    })

    it('paginates results and calculates total pages', async () => {
      await dependencies.repositories.jobs.insertTestJobs(
        Array.from({ length: 10 }, (_, index) => makeJob({ job_id: `job-${index + 1}` }))
      )

      const response = await request(testServer)
        .get('/api/jobs?page=2&page_size=3')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      expect(response.body).toMatchObject({ total: 10, page: 2, page_size: 3, total_pages: 4 })
      expect(response.body.items).toHaveLength(3)
    })

    it.each([
      ['desc', ['job-new', 'job-old']],
      ['asc', ['job-old', 'job-new']],
    ])('sorts created_at in %s order', async (sortOrder, expected) => {
      const now = Date.now()
      await dependencies.repositories.jobs.insertTestJobs([
        makeJob({ job_id: 'job-old', created_at: new Date(now - 2_000) }),
        makeJob({ job_id: 'job-new', created_at: new Date(now) }),
      ])

      const response = await request(testServer)
        .get(`/api/jobs?sort_order=${sortOrder}`)
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      expect(response.body.items.map((job: Job) => job.job_id)).toEqual(expected)
    })

    it('returns all public job fields', async () => {
      await dependencies.repositories.jobs.insertTestJobs([
        makeJob({
          job_id: 'job-check-fields',
          job_type: JOB_TYPE.REPORTS,
          game_id: 42,
          game_name: 'Test Game',
          status: JOB_STATUS.IN_PROGRESS,
          started_at: new Date(),
        }),
      ])

      const response = await request(testServer)
        .get('/api/jobs')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

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

    it.each([undefined, 'wrong-api-key'])('returns 401 for API key %s', async (apiKey) => {
      const pending = request(testServer).get('/api/jobs')
      if (apiKey) pending.set('x-api-key', apiKey)

      const response = await pending.expect(401)

      expect(response.body.data.error).toBe('Unauthorized')
    })

    it.each(['status=invalid_status', 'job_type=invalid_type', 'game_id=abc', 'page_size=101'])(
      'returns 400 for invalid query %s',
      async (query) => {
        const response = await request(testServer)
          .get(`/api/jobs?${query}`)
          .set('x-api-key', TEST_API_KEY)
          .expect(400)

        expect(response.body.data.error).toBe('Invalid request query parameters')
      }
    )

    it('returns 500 when the database query fails', async () => {
      vi.spyOn(dependencies.repositories.jobs, 'getJobs').mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const response = await request(testServer)
        .get('/api/jobs')
        .set('x-api-key', TEST_API_KEY)
        .expect(500)

      expect(response.body.data.error).toBe('Internal server error')
    })

    it('returns an empty item list for a page beyond the result set', async () => {
      await dependencies.repositories.jobs.insertTestJobs([makeJob()])

      const response = await request(testServer)
        .get('/api/jobs?page=999')
        .set('x-api-key', TEST_API_KEY)
        .expect(200)

      expect(response.body).toMatchObject({ items: [], total: 1 })
    })
  })

  describe('POST /api/jobs/queue', () => {
    it('queues and persists a job using Steam metadata', async () => {
      const response = await request(testServer)
        .post('/api/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 123, job_type: JOB_TYPE.SCRAPE })
        .expect(201)

      expect(response.body).toMatchObject({
        status: JOB_STATUS.QUEUED,
        game_id: 123,
        game_name: 'Mocked Steam Game 123',
        job_type: JOB_TYPE.SCRAPE,
      })
      expect(await dependencies.repositories.jobs.getJobById(response.body.job_id)).toMatchObject({
        game_id: 123,
        job_type: JOB_TYPE.SCRAPE,
      })
    })

    it('does not duplicate an active job for the same game and type', async () => {
      const body = { game_id: 456, job_type: JOB_TYPE.REPORTS }
      await request(testServer)
        .post('/api/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send(body)
        .expect(201)

      const response = await request(testServer)
        .post('/api/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send(body)
        .expect(409)

      expect(response.body.data.error).toContain('already in progress or queued')
    })

    it('returns 404 when Steam has no game details', async () => {
      vi.mocked(steamService.getSteamGameDetails).mockRejectedValueOnce(new Error('Steam error'))

      const response = await request(testServer)
        .post('/api/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 404, job_type: JOB_TYPE.SCRAPE })
        .expect(404)

      expect(response.body.data.error).toBe('Game not found on Steam')
    })

    it('returns 401 when the API key is missing', async () => {
      const response = await request(testServer)
        .post('/api/jobs/queue')
        .send({ game_id: 100, job_type: JOB_TYPE.SCRAPE })
        .expect(401)

      expect(response.body.data.error).toBe('Unauthorized')
    })

    it.each([
      { game_id: 100, job_type: 'invalid_type' },
      { game_id: 'abc', job_type: JOB_TYPE.SCRAPE },
    ])('validates queue body %j', async (body) => {
      const response = await request(testServer)
        .post('/api/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send(body)
        .expect(400)

      expect(response.body.data.error).toBe('Invalid request body')
    })

    it('returns 500 when queue insertion fails', async () => {
      vi.spyOn(dependencies.repositories.jobs, 'queueJob').mockRejectedValueOnce(
        new Error('Queue insertion failed')
      )

      const response = await request(testServer)
        .post('/api/jobs/queue')
        .set('x-api-key', TEST_API_KEY)
        .send({ game_id: 100, job_type: JOB_TYPE.SCRAPE })
        .expect(500)

      expect(response.body.data.error).toBe('Internal server error')
    })
  })

  describe('DELETE /api/jobs/:job_id', () => {
    const queuedJob = makeJob()
    const missingJobId = randomUUID()
    const inProgressJob = makeJob({ status: JOB_STATUS.IN_PROGRESS })

    it('deletes an existing queued job', async () => {
      await dependencies.repositories.jobs.insertTestJobs([queuedJob])

      await request(testServer)
        .delete(`/api/jobs/${queuedJob.job_id}`)
        .set('x-api-key', TEST_API_KEY)
        .expect(204)

      expect(await dependencies.repositories.jobs.getJobById(queuedJob.job_id)).toBeNull()
    })

    it('returns 409 when deleting a missing job', async () => {
      const response = await request(testServer)
        .delete(`/api/jobs/${missingJobId}`)
        .set('x-api-key', TEST_API_KEY)
        .expect(409)

      expect(response.body.data.error).toContain('cannot be deleted')
    })

    it('returns 409 when deleting an in-progress job', async () => {
      await dependencies.repositories.jobs.insertTestJobs([inProgressJob])

      const response = await request(testServer)
        .delete(`/api/jobs/${inProgressJob.job_id}`)
        .set('x-api-key', TEST_API_KEY)
        .expect(409)

      expect(response.body.data.error).toContain('cannot be deleted')
    })

    it('checks authorization before validating the job ID', async () => {
      const response = await request(testServer).delete('/api/jobs/not-a-uuid').expect(401)

      expect(response.body.data.error).toBe('Unauthorized')
    })

    it('returns 400 for an invalid job UUID', async () => {
      const response = await request(testServer)
        .delete('/api/jobs/not-a-uuid')
        .set('x-api-key', TEST_API_KEY)
        .expect(400)

      expect(response.body.data.error).toBe('Invalid request parameters')
    })

    it('returns 500 when deletion fails unexpectedly', async () => {
      const jobId = randomUUID()
      vi.spyOn(dependencies.repositories.jobs, 'deleteJob').mockRejectedValueOnce(
        new Error('Delete failed')
      )

      const response = await request(testServer)
        .delete(`/api/jobs/${jobId}`)
        .set('x-api-key', TEST_API_KEY)
        .expect(500)

      expect(response.body.data.error).toBe('Internal server error')
    })
  })
})

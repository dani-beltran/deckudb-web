import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { JOB_STATUS, JOB_TYPE } from '../../models/jobs.model'
import { cacheSteamApp, mountNuxtTestApp, type NuxtTestApp, unmountNuxtTestApp } from './test-app'
import { flushDB } from './test-db'

const TEST_API_KEY = process.env.NUXT_JOB_API_KEY || 'test-job-api-key'
let testApp: NuxtTestApp

const makeJob = (overrides: Record<string, unknown> = {}) => {
  const now = new Date()
  return {
    job_id: randomUUID(),
    game_id: 1,
    game_name: 'Test game',
    job_type: JOB_TYPE.SCRAPE,
    status: JOB_STATUS.QUEUED,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

describe('Nuxt jobs API', () => {
  beforeAll(async () => {
    testApp = await mountNuxtTestApp()
  })

  afterEach(async () => {
    await flushDB(testApp.db)
  })

  afterAll(async () => {
    await unmountNuxtTestApp(testApp)
  })

  it('lists jobs with API-key protection and filters', async () => {
    await testApp.db
      .collection('jobs')
      .insertMany([
        makeJob({ game_id: 10, status: JOB_STATUS.QUEUED }),
        makeJob({ game_id: 10, status: JOB_STATUS.COMPLETED }),
        makeJob({ game_id: 20, status: JOB_STATUS.COMPLETED }),
      ])

    await request(testApp.app).get('/api/jobs').expect(401)

    const response = await request(testApp.app)
      .get('/api/jobs?game_id=10&status=completed')
      .set('x-api-key', TEST_API_KEY)
      .expect(200)

    expect(response.body).toMatchObject({ total: 1, page: 1, page_size: 20, total_pages: 1 })
    expect(response.body.items).toEqual([
      expect.objectContaining({ game_id: 10, status: JOB_STATUS.COMPLETED }),
    ])
  })

  it('queues a job using cached Steam metadata', async () => {
    await cacheSteamApp(testApp.db, 42, { steam_appid: 42, name: 'Cached game', type: 'game' })

    const response = await request(testApp.app)
      .post('/api/jobs/queue')
      .set('x-api-key', TEST_API_KEY)
      .send({ game_id: 42, job_type: JOB_TYPE.SCRAPE })
      .expect(201)

    expect(response.body).toMatchObject({
      game_id: 42,
      game_name: 'Cached game',
      job_type: JOB_TYPE.SCRAPE,
      status: JOB_STATUS.QUEUED,
    })
    expect(await testApp.db.collection('jobs').countDocuments({ game_id: 42 })).toBe(1)
  })

  it('prevents an equivalent active job from being queued twice', async () => {
    await cacheSteamApp(testApp.db, 42, { steam_appid: 42, name: 'Cached game', type: 'game' })
    const job = { game_id: 42, job_type: JOB_TYPE.SCRAPE }

    await request(testApp.app)
      .post('/api/jobs/queue')
      .set('x-api-key', TEST_API_KEY)
      .send(job)
      .expect(201)
    const response = await request(testApp.app)
      .post('/api/jobs/queue')
      .set('x-api-key', TEST_API_KEY)
      .send(job)
      .expect(409)

    expect(response.body.data.error).toContain('already in progress or queued')
  })

  it('deletes a queued job', async () => {
    const job = makeJob()
    await testApp.db.collection('jobs').insertOne(job)

    await request(testApp.app)
      .delete(`/api/jobs/${job.job_id}`)
      .set('x-api-key', TEST_API_KEY)
      .expect(204)

    expect(await testApp.db.collection('jobs').findOne({ job_id: job.job_id })).toBeNull()
  })

  it('validates job IDs before deleting', async () => {
    const response = await request(testApp.app)
      .delete('/api/jobs/not-a-uuid')
      .set('x-api-key', TEST_API_KEY)
      .expect(400)

    expect(response.body.data.error).toBe('Invalid request parameters')
  })
})

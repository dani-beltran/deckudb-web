import { randomUUID } from 'node:crypto'
import { AUDIT_ACTION_TYPE, AUDIT_OUTCOME, type AuditLog } from '@server/models/audit-logs.schema'
import { JOB_STATUS, JOB_TYPE, type Job } from '@server/models/jobs.schema'
import * as steamService from '@server/services/steam/steam'
import type { SteamApp } from '@server/services/steam/steam.types'
import { bootstrapDependencies, type ServerDependencies } from '@server/utils/bootstrap'
import type { NodeListener } from 'h3'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNuxtTestServer } from './test-server'

const ADMIN_USERNAME = process.env.NUXT_ADMIN_USERNAME ?? process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD =
  process.env.NUXT_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? 'test-admin-password'

type AuditLogResponseItem = Omit<AuditLog, 'created_at'> & { created_at: string }
type TestClient = ReturnType<typeof request.agent>

const cookieValue = (setCookieHeader: string | string[] | undefined, name: string) => {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : []
  return cookies.find((cookie) => cookie.startsWith(`${name}=`))?.split(';', 1)[0]
}

const makeAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  audit_id: randomUUID(),
  created_at: new Date('2026-08-01T10:00:00.000Z'),
  user_identity: 'seed-admin',
  action_type: AUDIT_ACTION_TYPE.LOGIN,
  outcome: AUDIT_OUTCOME.SUCCESS,
  ...overrides,
})

const makeJob = (overrides: Partial<Job> = {}): Job => {
  const now = new Date()
  return {
    job_id: randomUUID(),
    job_type: JOB_TYPE.SCRAPE,
    game_id: 42,
    game_name: 'Audit test game',
    status: JOB_STATUS.QUEUED,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

describe('audit logs API', () => {
  let testServer: NodeListener
  let dependencies: ServerDependencies

  beforeAll(async () => {
    dependencies = await bootstrapDependencies({
      dbConnectionName: 'test-audit-logs-api',
      mongodbDatabase: 'deckudb-api-audit-logs',
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

  async function authenticate(client: TestClient) {
    return client
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
      .expect(200)
  }

  async function seedAuditLogs(logs: AuditLog[]) {
    await dependencies.repositories.auditLogs.insertTestAuditLogs(logs)
  }

  async function getActionLogs(client: TestClient, actionType: AuditLog['action_type']) {
    const response = await client
      .get('/api/admin/audit-logs')
      .query({ action_type: actionType, page_size: 100 })
      .expect(200)
    return response.body.items as AuditLogResponseItem[]
  }

  it('protects the audit viewer with the admin session', async () => {
    const unauthorized = await request(testServer).get('/api/admin/audit-logs').expect(401)
    expect(unauthorized.body.data.error).toBe('Unauthorized')

    const client = request.agent(testServer)
    await authenticate(client)

    const response = await client.get('/api/admin/audit-logs').expect(200)
    expect(response.body).toMatchObject({ total: 1, page: 1, page_size: 20, total_pages: 1 })
    expect(response.body.items).toEqual([
      expect.objectContaining({
        user_identity: ADMIN_USERNAME,
        action_type: 'login',
        outcome: 'success',
      }),
    ])
    expect(response.body.items[0]).not.toHaveProperty('_id')
  })

  it('returns immutable entries newest first with paginated results', async () => {
    const client = request.agent(testServer)
    await authenticate(client)

    const oldest = makeAuditLog({ created_at: new Date('2026-08-10T10:00:00.000Z') })
    const middle = makeAuditLog({
      created_at: new Date('2026-08-11T10:00:00.000Z'),
      action_type: AUDIT_ACTION_TYPE.JOB_RUN,
    })
    const newest = makeAuditLog({
      created_at: new Date('2026-08-12T10:00:00.000Z'),
      action_type: AUDIT_ACTION_TYPE.JOB_DELETE,
    })
    await seedAuditLogs([middle, newest, oldest])

    const firstPage = await client
      .get('/api/admin/audit-logs')
      .query({ user_identity: 'seed-admin', page: 1, page_size: 2 })
      .expect(200)

    expect(firstPage.body).toMatchObject({ total: 3, page: 1, page_size: 2, total_pages: 2 })
    expect((firstPage.body.items as AuditLogResponseItem[]).map((item) => item.audit_id)).toEqual([
      newest.audit_id,
      middle.audit_id,
    ])

    const secondPage = await client
      .get('/api/admin/audit-logs')
      .query({ user_identity: 'seed-admin', page: 2, page_size: 2 })
      .expect(200)

    expect(secondPage.body).toMatchObject({ total: 3, page: 2, page_size: 2, total_pages: 2 })
    expect((secondPage.body.items as AuditLogResponseItem[]).map((item) => item.audit_id)).toEqual([
      oldest.audit_id,
    ])
  })

  it('filters by exact user, action type, and inclusive date range', async () => {
    const client = request.agent(testServer)
    await authenticate(client)

    const beforeRange = makeAuditLog({ created_at: new Date('2026-08-09T23:59:59.999Z') })
    const rangeStart = makeAuditLog({
      created_at: new Date('2026-08-10T00:00:00.000Z'),
      action_type: AUDIT_ACTION_TYPE.JOB_RUN,
    })
    const rangeEnd = makeAuditLog({
      created_at: new Date('2026-08-20T23:59:59.999Z'),
      action_type: AUDIT_ACTION_TYPE.JOB_RUN,
    })
    const afterRange = makeAuditLog({
      created_at: new Date('2026-08-21T00:00:00.000Z'),
      action_type: AUDIT_ACTION_TYPE.JOB_DELETE,
    })
    const otherUser = makeAuditLog({
      created_at: new Date('2026-08-15T12:00:00.000Z'),
      user_identity: 'another-admin',
      action_type: AUDIT_ACTION_TYPE.JOB_RUN,
    })
    await seedAuditLogs([beforeRange, rangeStart, rangeEnd, afterRange, otherUser])

    const byUser = await client
      .get('/api/admin/audit-logs')
      .query({ user_identity: 'another-admin' })
      .expect(200)
    expect(byUser.body.total).toBe(1)
    expect(byUser.body.items[0].audit_id).toBe(otherUser.audit_id)

    const byAction = await client
      .get('/api/admin/audit-logs')
      .query({ user_identity: 'seed-admin', action_type: 'job_run' })
      .expect(200)
    expect(byAction.body.total).toBe(2)
    expect((byAction.body.items as AuditLogResponseItem[]).map((item) => item.audit_id)).toEqual([
      rangeEnd.audit_id,
      rangeStart.audit_id,
    ])

    const byDateRange = await client
      .get('/api/admin/audit-logs')
      .query({ user_identity: 'seed-admin', date_from: '2026-08-10', date_to: '2026-08-20' })
      .expect(200)
    expect(byDateRange.body.total).toBe(2)
    expect((byDateRange.body.items as AuditLogResponseItem[]).map((item) => item.audit_id)).toEqual(
      [rangeEnd.audit_id, rangeStart.audit_id]
    )
  })

  it.each([
    ['invalid date_from', { date_from: 'not-a-date' }],
    ['invalid date_to', { date_to: 'not-a-date' }],
    ['reversed date range', { date_from: '2026-08-21', date_to: '2026-08-20' }],
    ['invalid action type', { action_type: 'job_trigger' }],
  ])('rejects an %s', async (_case, query) => {
    const client = request.agent(testServer)
    await authenticate(client)

    const response = await client.get('/api/admin/audit-logs').query(query).expect(400)
    expect(response.body.data.error).toBe('Invalid request query parameters')
  })

  it('audits successful and failed login attempts without credentials or session identifiers', async () => {
    const client = request.agent(testServer)
    const rejectedPassword = 'never-store-this-rejected-password'
    const bearerToken = 'never-store-this-login-token'

    await client
      .post('/api/admin/auth/login')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ username: ADMIN_USERNAME, password: rejectedPassword })
      .expect(401)
    await client
      .post('/api/admin/auth/login')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ username: ADMIN_USERNAME })
      .expect(400)

    const loginResponse = await client
      .post('/api/admin/auth/login')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
      .expect(200)
    const sessionCookie = cookieValue(loginResponse.headers['set-cookie'], 'decku.sid')
    const sessionId = sessionCookie?.split('=', 2)[1]?.split('.', 1)[0]

    const logs = await getActionLogs(client, AUDIT_ACTION_TYPE.LOGIN)
    expect(logs).toHaveLength(3)
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_identity: ADMIN_USERNAME,
          action_type: 'login',
          outcome: 'success',
        }),
        expect.objectContaining({
          user_identity: ADMIN_USERNAME,
          action_type: 'login',
          outcome: 'failure',
          context: expect.objectContaining({ reason: 'unauthorized', status_code: 401 }),
        }),
        expect.objectContaining({
          user_identity: ADMIN_USERNAME,
          action_type: 'login',
          outcome: 'failure',
          context: expect.objectContaining({ reason: 'invalid_request', status_code: 400 }),
        }),
      ])
    )

    const serializedLogs = JSON.stringify(logs)
    for (const sensitiveValue of [
      ADMIN_PASSWORD,
      rejectedPassword,
      bearerToken,
      sessionCookie,
      sessionId,
      'decku.sid',
    ]) {
      if (sensitiveValue) expect(serializedLogs).not.toContain(sensitiveValue)
    }
  })

  it('audits successful and failed job runs with the acting user and safe target context', async () => {
    const client = request.agent(testServer)
    await authenticate(client)
    const bearerToken = 'never-store-this-job-run-token'
    const requestBody = { game_id: 123, job_type: JOB_TYPE.SCRAPE }

    const queuedResponse = await client
      .post('/api/jobs/queue')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(requestBody)
      .expect(201)
    await client
      .post('/api/jobs/queue')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(requestBody)
      .expect(409)

    const logs = await getActionLogs(client, AUDIT_ACTION_TYPE.JOB_RUN)
    expect(logs).toHaveLength(2)
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_identity: ADMIN_USERNAME,
          action_type: 'job_run',
          target_resource: 'job',
          target_id: queuedResponse.body.job_id,
          outcome: 'success',
          context: expect.objectContaining({
            game_id: requestBody.game_id,
            game_name: 'Mocked Steam Game 123',
            job_type: requestBody.job_type,
          }),
        }),
        expect.objectContaining({
          user_identity: ADMIN_USERNAME,
          action_type: 'job_run',
          target_resource: 'job',
          outcome: 'failure',
          context: expect.objectContaining({
            game_id: requestBody.game_id,
            job_type: requestBody.job_type,
            reason: 'conflict',
            status_code: 409,
          }),
        }),
      ])
    )
    expect(JSON.stringify(logs)).not.toContain(bearerToken)
  })

  it('audits successful and failed job deletions and retains the requested job IDs', async () => {
    const client = request.agent(testServer)
    await authenticate(client)
    const queuedJob = makeJob()
    const missingJobId = randomUUID()
    const bearerToken = 'never-store-this-delete-token'
    await dependencies.repositories.jobs.insertTestJobs([queuedJob])

    await client
      .delete(`/api/jobs/${queuedJob.job_id}`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(204)
    await client
      .delete(`/api/jobs/${missingJobId}`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(409)

    const logs = await getActionLogs(client, AUDIT_ACTION_TYPE.JOB_DELETE)
    expect(logs).toHaveLength(2)
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_identity: ADMIN_USERNAME,
          action_type: 'job_delete',
          target_resource: 'job',
          target_id: queuedJob.job_id,
          outcome: 'success',
        }),
        expect.objectContaining({
          user_identity: ADMIN_USERNAME,
          action_type: 'job_delete',
          target_resource: 'job',
          target_id: missingJobId,
          outcome: 'failure',
          context: expect.objectContaining({ reason: 'conflict', status_code: 409 }),
        }),
      ])
    )
    expect(JSON.stringify(logs)).not.toContain(bearerToken)
  })

  it('audits an authenticated logout after capturing the actor', async () => {
    const bearerToken = 'never-store-this-logout-token'
    await request(testServer)
      .post('/api/admin/auth/logout')
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(200)

    const client = request.agent(testServer)
    const loginResponse = await authenticate(client)
    const sessionCookie = cookieValue(loginResponse.headers['set-cookie'], 'decku.sid')
    const sessionId = sessionCookie?.split('=', 2)[1]?.split('.', 1)[0]
    await client
      .post('/api/admin/auth/logout')
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(200)

    const viewer = request.agent(testServer)
    await authenticate(viewer)
    const logs = await getActionLogs(viewer, AUDIT_ACTION_TYPE.LOGOUT)
    expect(logs).toEqual([
      expect.objectContaining({
        user_identity: ADMIN_USERNAME,
        action_type: 'logout',
        outcome: 'success',
      }),
    ])

    const serializedLogs = JSON.stringify(logs)
    for (const sensitiveValue of [bearerToken, sessionCookie, sessionId, 'decku.sid']) {
      if (sensitiveValue) expect(serializedLogs).not.toContain(sensitiveValue)
    }
  })
})

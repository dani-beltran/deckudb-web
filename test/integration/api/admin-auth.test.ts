import { randomUUID } from 'node:crypto'
import sessionMiddleware from '@server/middleware/session'
import { JOB_STATUS, JOB_TYPE, type Job } from '@server/models/jobs.schema'
import { bootstrapDependencies, type ServerDependencies } from '@server/utils/bootstrap'
import { createApp, defineEventHandler, type NodeListener, toNodeListener } from 'h3'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createNuxtTestServer } from './test-server'

const ADMIN_USERNAME = process.env.NUXT_ADMIN_USERNAME ?? process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD =
  process.env.NUXT_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? 'test-admin-password'

const cookieValue = (setCookieHeader: string | string[] | undefined, name: string) => {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : []
  return cookies.find((cookie) => cookie.startsWith(`${name}=`))?.split(';', 1)[0]
}

const makeJob = (): Job => {
  const now = new Date()
  return {
    job_id: randomUUID(),
    job_type: JOB_TYPE.SCRAPE,
    game_id: 42,
    game_name: 'Authenticated test game',
    status: JOB_STATUS.QUEUED,
    started_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  }
}

const createAdminPageTestServer = () => {
  const app = createApp()
  app.use(sessionMiddleware)
  app.use(defineEventHandler(() => ({ page: 'rendered' })))
  return toNodeListener(app)
}

describe('admin authentication', () => {
  let testServer: NodeListener
  let adminPageTestServer: NodeListener
  let dependencies: ServerDependencies

  beforeAll(async () => {
    dependencies = await bootstrapDependencies({
      dbConnectionName: 'test-admin-auth-api',
      mongodbDatabase: 'deckudb-api-admin-auth',
    })
    testServer = createNuxtTestServer(dependencies)
    adminPageTestServer = createAdminPageTestServer()
  })

  afterEach(async () => {
    await dependencies.databaseClient.flushDB()
  })

  afterAll(async () => {
    await dependencies.databaseClient.disconnect()
  })

  it('reports an unauthenticated session before login', async () => {
    const response = await request(testServer).get('/api/admin/auth/session').expect(200)

    expect(response.body).toEqual({ authenticated: false })
  })

  it('redirects an unauthenticated admin page request and preserves its path and query', async () => {
    const response = await request(adminPageTestServer)
      .get('/admin/jobs?status=failed&sort=desc')
      .expect(302)

    expect(response.headers.location).toBe(
      '/admin/login?redirect=%2Fadmin%2Fjobs%3Fstatus%3Dfailed%26sort%3Ddesc'
    )
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('redirects unauthenticated HEAD requests for the admin route', async () => {
    const response = await request(adminPageTestServer).head('/admin').expect(302)

    expect(response.headers.location).toBe('/admin/login?redirect=%2Fadmin')
  })

  it.each(['/admin/login', '/admin/login/'])(
    'allows unauthenticated access to the login page at %s',
    async (path) => {
      const response = await request(adminPageTestServer).get(path).expect(200)

      expect(response.body).toEqual({ page: 'rendered' })
      expect(response.headers.location).toBeUndefined()
    }
  )

  it.each([
    ['incorrect username', 'not-the-admin', ADMIN_PASSWORD],
    ['incorrect password', ADMIN_USERNAME, 'not-the-password'],
  ])('returns the same generic error for an %s', async (_case, username, password) => {
    const response = await request(testServer)
      .post('/api/admin/auth/login')
      .send({ username, password })
      .expect(401)

    expect(response.body.data.error).toBe('Unauthorized')
    expect(JSON.stringify(response.body)).not.toContain(username)
    expect(JSON.stringify(response.body)).not.toContain(password)
  })

  it('persists authentication and rotates the session cookie after login', async () => {
    const client = request.agent(testServer)
    const anonymousResponse = await client.get('/api/admin/auth/session').expect(200)
    const anonymousCookie = cookieValue(anonymousResponse.headers['set-cookie'], 'decku.sid')

    expect(anonymousCookie).toBeDefined()
    if (!anonymousCookie) throw new Error('Expected an anonymous session cookie')

    const loginResponse = await client
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
      .expect(200)
    const authenticatedCookie = cookieValue(loginResponse.headers['set-cookie'], 'decku.sid')

    expect(loginResponse.body).toEqual({ authenticated: true })
    expect(authenticatedCookie).toBeDefined()
    expect(authenticatedCookie).not.toBe(anonymousCookie)

    const sessionResponse = await client.get('/api/admin/auth/session').expect(200)
    expect(sessionResponse.body).toEqual({ authenticated: true })

    const oldSessionResponse = await request(testServer)
      .get('/api/admin/auth/session')
      .set('Cookie', anonymousCookie)
      .expect(200)
    expect(oldSessionResponse.body).toEqual({ authenticated: false })
  })

  it('redirects an authenticated login-page request and allows protected admin pages', async () => {
    const loginResponse = await request(testServer)
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
      .expect(200)
    const authenticatedCookie = cookieValue(loginResponse.headers['set-cookie'], 'decku.sid')

    expect(authenticatedCookie).toBeDefined()
    if (!authenticatedCookie) throw new Error('Expected an authenticated session cookie')

    const response = await request(adminPageTestServer)
      .get('/admin/login/')
      .set('Cookie', authenticatedCookie)
      .expect(302)

    expect(response.headers.location).toBe('/admin')

    const adminPageResponse = await request(adminPageTestServer)
      .get('/admin/jobs')
      .set('Cookie', authenticatedCookie)
      .expect(200)
    expect(adminPageResponse.body).toEqual({ page: 'rendered' })
  })

  it('logs out and invalidates the authenticated session', async () => {
    const client = request.agent(testServer)
    const loginResponse = await client
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
      .expect(200)
    const authenticatedCookie = cookieValue(loginResponse.headers['set-cookie'], 'decku.sid')

    expect(authenticatedCookie).toBeDefined()
    if (!authenticatedCookie) throw new Error('Expected an authenticated session cookie')

    const logoutResponse = await client.post('/api/admin/auth/logout').expect(200)

    expect(logoutResponse.body).toEqual({ authenticated: false })
    expect(cookieValue(logoutResponse.headers['set-cookie'], 'decku.sid')).toBe('decku.sid=')

    const sessionResponse = await client.get('/api/admin/auth/session').expect(200)
    expect(sessionResponse.body).toEqual({ authenticated: false })

    const invalidatedSessionResponse = await request(testServer)
      .get('/api/admin/auth/session')
      .set('Cookie', authenticatedCookie)
      .expect(200)
    expect(invalidatedSessionResponse.body).toEqual({ authenticated: false })
  })

  it('denies unauthenticated access to the jobs API', async () => {
    const response = await request(testServer).get('/api/jobs').expect(401)

    expect(response.body.data.error).toBe('Unauthorized')
  })

  it('allows an authenticated admin session to list jobs', async () => {
    const job = makeJob()
    await dependencies.repositories.jobs.insertTestJobs([job])
    const client = request.agent(testServer)
    await client
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
      .expect(200)

    const response = await client.get('/api/jobs').expect(200)

    expect(response.body.items).toEqual([
      expect.objectContaining({ job_id: job.job_id, game_name: job.game_name }),
    ])
  })
})

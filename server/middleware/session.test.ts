import { createApp, createRouter, toNodeListener } from 'h3'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import sessionMiddleware from './session'

const createSessionTestApp = () => {
  const app = createApp()
  const router = createRouter()

  app.use(sessionMiddleware)
  router.get('/api/health', (event) => ({ sessionId: event.context.session?.id }))
  router.get('/health', (event) => ({ sessionId: event.context.session?.id }))
  app.use(router.handler)

  return toNodeListener(app)
}

describe('Nitro session middleware', () => {
  it('creates a signed session and reuses it on later API requests', async () => {
    const client = request.agent(createSessionTestApp())

    const firstResponse = await client.get('/api/health').expect(200)
    const sessionId = firstResponse.body.sessionId

    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(firstResponse.headers['set-cookie']?.[0]).toMatch(
      /^decku\.sid=[0-9a-f-]{36}\.[A-Za-z0-9_-]+;/
    )

    const secondResponse = await client.get('/api/health').expect(200)

    expect(secondResponse.body.sessionId).toBe(sessionId)
    expect(secondResponse.headers['set-cookie']).toBeUndefined()
  })

  it('replaces an invalid signed cookie with a new session', async () => {
    const response = await request(createSessionTestApp())
      .get('/api/health')
      .set('Cookie', 'decku.sid=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.invalid')
      .expect(200)

    expect(response.body.sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(response.headers['set-cookie']?.[0]).toMatch(
      /^decku\.sid=[0-9a-f-]{36}\.[A-Za-z0-9_-]+;/
    )
  })

  it('does not create sessions for non-API routes', async () => {
    const response = await request(createSessionTestApp()).get('/health').expect(200)

    expect(response.body.sessionId).toBeUndefined()
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('shares sessions across multiple app instances', async () => {
    const app1 = createSessionTestApp()
    const app2 = createSessionTestApp()

    const firstResponse = await request(app1).get('/api/health').expect(200)
    const sessionId = firstResponse.body.sessionId
    const cookie = firstResponse.headers['set-cookie']?.[0]

    expect(cookie).toBeDefined()

    const secondResponse = await request(app2)
      .get('/api/health')
      .set('Cookie', cookie)
      .expect(200)

    expect(secondResponse.body.sessionId).toBe(sessionId)
    expect(secondResponse.headers['set-cookie']).toBeUndefined()
  })
})

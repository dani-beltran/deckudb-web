import { createRateLimitMiddleware } from '@server/middleware/rate-limit'
import { bootstrapDependencies, type ServerDependencies } from '@server/utils/bootstrap'
import { createApp, createRouter, defineEventHandler, type NodeListener, toNodeListener } from 'h3'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const baseConfig = {
  loginRateLimitMaxRequests: 2,
  loginRateLimitWindowMs: 15 * 60_000,
  rateLimitEnabled: true,
  rateLimitMaxRequests: 2,
  rateLimitTrustedProxyHops: 0,
  rateLimitWindowMs: 60_000,
}

describe('API rate limiting', () => {
  let dependencies: ServerDependencies

  const createTestServer = (config: typeof baseConfig = baseConfig): NodeListener => {
    const app = createApp()
    const router = createRouter()

    app.use(
      defineEventHandler((event) => {
        event.context = { ...event.context, ...dependencies }
      })
    )
    app.use(createRateLimitMiddleware(() => config))
    router.get('/api/resource', () => ({ status: 'OK' }))
    router.options('/api/resource', () => null)
    router.get('/api/health', () => ({ status: 'OK' }))
    router.post('/api/admin/auth/login', () => ({ authenticated: false }))
    router.get('/page', () => ({ status: 'OK' }))
    app.use(router.handler)

    return toNodeListener(app)
  }

  beforeAll(async () => {
    dependencies = await bootstrapDependencies({
      dbConnectionName: 'test-rate-limit-api',
      mongodbDatabase: 'deckudb-api-rate-limit',
    })
    await dependencies.repositories.rateLimits.createIndexes()
  })

  afterEach(async () => {
    await dependencies.databaseClient.flushDB()
  })

  afterAll(async () => {
    await dependencies.databaseClient.disconnect()
  })

  it('returns quota headers and rejects requests after the sliding-window limit', async () => {
    const testServer = createTestServer()

    const firstResponse = await request(testServer).get('/api/resource').expect(200)
    expect(firstResponse.headers['ratelimit-policy']).toBe('"api";q=2;w=60')
    expect(firstResponse.headers.ratelimit).toMatch(/^"api";r=1;t=\d+$/)

    const secondResponse = await request(testServer).get('/api/resource').expect(200)
    expect(secondResponse.headers.ratelimit).toMatch(/^"api";r=0;t=\d+$/)

    const rejectedResponse = await request(testServer).get('/api/resource').expect(429)
    expect(rejectedResponse.headers['retry-after']).toMatch(/^\d+$/)
    expect(rejectedResponse.headers['cache-control']).toBe('private, no-store')
    expect(rejectedResponse.body.data).toEqual({
      error: 'Too Many Requests',
      retryAfter: Number(rejectedResponse.headers['retry-after']),
    })
  })

  it('applies an independent, stricter policy to admin login attempts', async () => {
    const testServer = createTestServer({
      ...baseConfig,
      loginRateLimitMaxRequests: 1,
    })

    const firstResponse = await request(testServer).post('/api/admin/auth/login').expect(200)
    expect(firstResponse.headers['ratelimit-policy']).toBe('"login";q=1;w=900')

    await request(testServer).post('/api/admin/auth/login').expect(429)
    await request(testServer).get('/api/resource').expect(200)
  })

  it('does not spend quota on health checks, preflights, or non-API routes', async () => {
    const testServer = createTestServer({
      ...baseConfig,
      rateLimitMaxRequests: 1,
    })

    await request(testServer).get('/api/health').expect(200)
    await request(testServer).get('/api/health').expect(200)
    await request(testServer).options('/api/resource').expect(204)
    await request(testServer).options('/api/resource').expect(204)
    await request(testServer).get('/page').expect(200)
    await request(testServer).get('/page').expect(200)

    await request(testServer).get('/api/resource').expect(200)
    await request(testServer).get('/api/resource').expect(429)
  })

  it('ignores spoofed forwarding headers unless trusted proxy hops are configured', async () => {
    const testServer = createTestServer({
      ...baseConfig,
      rateLimitMaxRequests: 1,
    })

    await request(testServer)
      .get('/api/resource')
      .set('X-Forwarded-For', '198.51.100.10')
      .expect(200)
    await request(testServer)
      .get('/api/resource')
      .set('X-Forwarded-For', '198.51.100.11')
      .expect(429)
  })

  it('uses the configured trusted hop to distinguish proxied clients', async () => {
    const testServer = createTestServer({
      ...baseConfig,
      rateLimitMaxRequests: 1,
      rateLimitTrustedProxyHops: 1,
    })

    await request(testServer)
      .get('/api/resource')
      .set('X-Forwarded-For', '198.51.100.10')
      .expect(200)
    await request(testServer)
      .get('/api/resource')
      .set('X-Forwarded-For', '198.51.100.10')
      .expect(429)
    await request(testServer)
      .get('/api/resource')
      .set('X-Forwarded-For', '198.51.100.11')
      .expect(200)
  })

  it('enforces the limit atomically and releases quota when the window expires', async () => {
    const limiter = dependencies.repositories.rateLimits
    const now = new Date('2026-08-18T12:00:00.000Z')
    const options = { limit: 5, now, windowMs: 1_000 }

    const concurrentResults = await Promise.all(
      Array.from({ length: 20 }, () => limiter.consume('concurrent-client', options))
    )

    expect(concurrentResults.filter((result) => result.allowed)).toHaveLength(5)
    expect(concurrentResults.filter((result) => !result.allowed)).toHaveLength(15)

    const afterWindow = await limiter.consume('concurrent-client', {
      ...options,
      now: new Date(now.getTime() + options.windowMs + 1),
    })
    expect(afterWindow).toMatchObject({ allowed: true, remaining: 4 })
  })
})

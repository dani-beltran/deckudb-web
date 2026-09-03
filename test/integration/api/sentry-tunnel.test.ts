import sentryTunnelHandler from '@server/api/tunnel.post'
import { createApp, createRouter, toNodeListener } from 'h3'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SENTRY_DSN = 'https://public-key@o123.ingest.sentry.io/456'

function createEnvelope(dsn = SENTRY_DSN) {
  return `${JSON.stringify({ dsn, event_id: 'event-id' })}\n${JSON.stringify({ type: 'event' })}\n{}`
}

function createTunnelServer() {
  const router = createRouter().post('/api/tunnel', sentryTunnelHandler)
  const app = createApp().use(router.handler)
  return toNodeListener(app)
}

describe('Sentry tunnel', () => {
  beforeEach(() => {
    vi.stubEnv('NUXT_PUBLIC_SENTRY_DSN', SENTRY_DSN)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('forwards the raw envelope to the configured Sentry project', async () => {
    const envelope = createEnvelope()
    const upstreamResponse = new Response('', {
      status: 200,
      headers: { 'x-sentry-rate-limits': '60:error:organization' },
    })
    const fetchMock = vi.fn().mockResolvedValue(upstreamResponse)
    vi.stubGlobal('fetch', fetchMock)

    const response = await request(createTunnelServer())
      .post('/api/tunnel')
      .set('content-type', 'application/x-sentry-envelope')
      .send(envelope)
      .expect(200)

    expect(response.headers['x-sentry-rate-limits']).toBe('60:error:organization')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('https://o123.ingest.sentry.io/api/456/envelope/', {
      method: 'POST',
      body: new Uint8Array(Buffer.from(envelope)).buffer,
      headers: { 'content-type': 'application/x-sentry-envelope' },
    })
  })

  it.each([
    ['another host', 'https://public-key@evil.example/456'],
    ['another project', 'https://public-key@o123.ingest.sentry.io/999'],
    ['another public key', 'https://different-key@o123.ingest.sentry.io/456'],
  ])('rejects an envelope for %s', async (_label, dsn) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await request(createTunnelServer())
      .post('/api/tunnel')
      .set('content-type', 'application/x-sentry-envelope')
      .send(createEnvelope(dsn))
      .expect(400)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns unavailable when Sentry has no configured DSN', async () => {
    vi.stubEnv('NUXT_PUBLIC_SENTRY_DSN', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await request(createTunnelServer()).post('/api/tunnel').send(createEnvelope()).expect(503)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes upstream rate limiting back to the SDK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('', {
          status: 429,
          headers: { 'retry-after': '30' },
        })
      )
    )

    const response = await request(createTunnelServer())
      .post('/api/tunnel')
      .set('content-type', 'application/x-sentry-envelope')
      .send(createEnvelope())
      .expect(429)

    expect(response.headers['retry-after']).toBe('30')
  })
})

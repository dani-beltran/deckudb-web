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
    vi.useRealTimers()
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
      signal: expect.any(AbortSignal),
    })
  })

  it.each([
    ['another protocol', 'http://public-key@o123.ingest.sentry.io/456'],
    ['another host', 'https://public-key@evil.example/456'],
    ['another port', 'https://public-key@o123.ingest.sentry.io:8443/456'],
    ['another path prefix', 'https://public-key@o123.ingest.sentry.io/sentry/456'],
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

  it('forwards envelopes for a self-hosted DSN with a path prefix', async () => {
    const dsn = 'https://public-key@sentry.example:8443/monitoring/sentry/456'
    vi.stubEnv('NUXT_PUBLIC_SENTRY_DSN', dsn)
    const fetchMock = vi.fn().mockResolvedValue(new Response(''))
    vi.stubGlobal('fetch', fetchMock)

    await request(createTunnelServer()).post('/api/tunnel').send(createEnvelope(dsn)).expect(200)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://sentry.example:8443/monitoring/sentry/api/456/envelope/',
      expect.any(Object)
    )
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

  it('aborts stalled upstream headers after 10 seconds and returns 502', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const started = Promise.withResolvers<AbortSignal>()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, { signal }: RequestInit) => {
        const upstreamSignal = signal as AbortSignal
        started.resolve(upstreamSignal)
        return new Promise<Response>((_resolve, reject) => {
          upstreamSignal.addEventListener('abort', () => reject(upstreamSignal.reason), {
            once: true,
          })
        })
      })
    )

    const response = request(createTunnelServer())
      .post('/api/tunnel')
      .send(createEnvelope())
      .expect(502)
      .then((result) => result)
    const signal = await started.promise

    await vi.advanceTimersByTimeAsync(9_999)
    expect(signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await response
    expect(signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears the deadline when upstream fetch fails', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Upstream unavailable')))

    await request(createTunnelServer()).post('/api/tunnel').send(createEnvelope()).expect(502)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('allows the response body to stream past the header deadline', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const streaming = Promise.withResolvers<void>()
    let bodyController!: ReadableStreamDefaultController<Uint8Array>
    const body = new ReadableStream<Uint8Array>(
      {
        start(controller) {
          bodyController = controller
        },
        pull() {
          streaming.resolve()
        },
      },
      { highWaterMark: 0 }
    )
    const fetchMock = vi.fn().mockResolvedValue(new Response(body))
    vi.stubGlobal('fetch', fetchMock)

    const response = request(createTunnelServer())
      .post('/api/tunnel')
      .send(createEnvelope())
      .expect(200)
      .then((result) => result)
    await streaming.promise

    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(15_000)
    const signal = fetchMock.mock.calls[0]?.[1].signal as AbortSignal
    expect(signal.aborted).toBe(false)
    bodyController.enqueue(new TextEncoder().encode('upstream response'))
    bodyController.close()

    expect((await response).text).toBe('upstream response')
    expect(signal.aborted).toBe(false)
  })

  it.each(['before headers', 'during streaming'])(
    'aborts the upstream request when the client disconnects %s',
    async (phase) => {
      const started = Promise.withResolvers<AbortSignal>()
      const aborted = Promise.withResolvers<void>()
      vi.stubGlobal(
        'fetch',
        vi.fn((_url, { signal }: RequestInit) => {
          const upstreamSignal = signal as AbortSignal
          if (phase === 'before headers') {
            started.resolve(upstreamSignal)
            return new Promise<Response>((_resolve, reject) => {
              upstreamSignal.addEventListener(
                'abort',
                () => {
                  reject(upstreamSignal.reason)
                  aborted.resolve()
                },
                { once: true }
              )
            })
          }

          return Promise.resolve(
            new Response(
              new ReadableStream(
                {
                  start(controller) {
                    upstreamSignal.addEventListener(
                      'abort',
                      () => {
                        controller.error(upstreamSignal.reason)
                        aborted.resolve()
                      },
                      { once: true }
                    )
                  },
                  pull() {
                    started.resolve(upstreamSignal)
                  },
                },
                { highWaterMark: 0 }
              )
            )
          )
        })
      )

      const client = request(createTunnelServer()).post('/api/tunnel').send(createEnvelope())
      const response = client.then(
        () => undefined,
        (error: Error) => error
      )
      const signal = await started.promise
      expect(signal.aborted).toBe(false)
      client.abort()

      await aborted.promise
      expect(signal.aborted).toBe(true)
      expect(await response).toBeInstanceOf(Error)
    }
  )
})

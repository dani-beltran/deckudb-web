import { describe, expect, it } from 'vitest'
import {
  parseSentryTracesSampleRate,
  scrubSentryEvent,
  scrubSentryLog,
  scrubSentrySpan,
  scrubServerSentryEvent,
} from '@shared/sentry'

describe('parseSentryTracesSampleRate', () => {
  it.each([
    [0, 0],
    ['0.25', 0.25],
    [1, 1],
  ])('accepts a sample rate within the inclusive range', (value, expected) => {
    expect(parseSentryTracesSampleRate(value)).toBe(expected)
  })

  it.each([undefined, '', -0.1, 1.1, 'not-a-number'])('uses the fallback for %s', (value) => {
    expect(parseSentryTracesSampleRate(value, 0.5)).toBe(0.5)
  })
})

describe('scrubSentryLog', () => {
  it('redacts credentials in messages and nested attributes', () => {
    const log = scrubSentryLog({
      message: 'Login failed password=super-secret token: "secret-token"',
      attributes: {
        operation: 'admin_login',
        session_id: 'session-value',
        user_identity: 'admin@example.com',
        nested: {
          apiKey: 'api-key-value',
          result: 'failed',
        },
      },
    })

    expect(log).toEqual({
      message: 'Login failed password=[Filtered] token: [Filtered]',
      attributes: {
        operation: 'admin_login',
        session_id: '[Filtered]',
        user_identity: '[Filtered]',
        nested: {
          apiKey: '[Filtered]',
          result: 'failed',
        },
      },
    })
  })

  it('removes credentials and query values from URLs in log messages', () => {
    const log = scrubSentryLog({
      message:
        'Fetch https://api-user:api-password@example.com/search?term=private failed; user_identity=admin',
    })

    expect(log.message).toBe(
      'Fetch https://[Filtered]@example.com/search?[Filtered] failed; user_identity=[Filtered]'
    )
  })
})

describe('scrubSentryEvent', () => {
  it('removes request and user data and scrubs exception messages', () => {
    const event = scrubSentryEvent({
      type: undefined,
      user: { id: 'private-user' },
      request: {
        url: 'https://example.com/api/search?term=private',
        headers: { authorization: 'Bearer secret' },
        data: { password: 'secret' },
      },
      exception: {
        values: [{ value: 'Request failed at /api/search?term=private token=secret' }],
      },
    })

    expect(event).toEqual({
      type: undefined,
      request: { url: 'https://example.com/api/search?[Filtered]' },
      exception: {
        values: [{ value: 'Request failed at /api/search?[Filtered] token=[Filtered]' }],
      },
    })
  })

  it('drops expected HTTP errors while retaining server failures', () => {
    const event = { type: undefined, message: 'request failed' }

    expect(scrubServerSentryEvent(event, { originalException: { statusCode: 401 } })).toBeNull()
    expect(
      scrubServerSentryEvent(event, {
        originalException: { cause: { status: 429 } },
      })
    ).toBeNull()
    expect(scrubServerSentryEvent(event, { originalException: { statusCode: 500 } })).toEqual(
      event
    )
  })
})

describe('scrubSentrySpan', () => {
  it('removes sensitive attributes and query values from span URLs', () => {
    const span = scrubSentrySpan({
      trace_id: 'trace-id',
      span_id: 'span-id',
      start_timestamp: 1,
      description: 'GET https://example.com/api/search?term=private',
      data: {
        'url.full': 'https://example.com/api/search?term=private',
        'http.client_ip': '192.0.2.1',
        'http.request.method': 'GET',
      },
    })

    expect(span.description).toBe('GET https://example.com/api/search?[Filtered]')
    expect(span.data).toEqual({
      'url.full': 'https://example.com/api/search?[Filtered]',
      'http.request.method': 'GET',
    })
  })
})

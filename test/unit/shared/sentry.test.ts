import { redactText } from '@shared/redaction'
import {
  parseSentryTracesSampleRate,
  scrubSentryEvent,
  scrubSentryLog,
  scrubSentrySpan,
  scrubServerSentryEvent,
} from '@shared/sentry'
import { describe, expect, it } from 'vitest'

describe('redactText', () => {
  it.each([
    ['authorization: Bearer bearer-token', 'authorization: [Filtered]'],
    ['authorization=Basic basic-credential', 'authorization=[Filtered]'],
    ['password=unquoted-value', 'password=[Filtered]'],
    [`token: 'quoted value'`, 'token: [Filtered]'],
    [
      '{"password":"escaped \\"secret\\" value","safe":"visible"}',
      '{"password":[Filtered],"safe":"visible"}',
    ],
  ])('redacts sensitive text in %s', (value, expected) => {
    expect(redactText(value)).toBe(expected)
  })

  it.each(['http', 'https', 'mongodb', 'mongodb+srv'])(
    'redacts username-only and password-bearing %s URL credentials',
    (scheme) => {
      expect(redactText(`${scheme}://token@example.com/path`)).toBe(
        `${scheme}://[Filtered]@example.com/path`
      )
      expect(redactText(`${scheme}://user:password@example.com/path`)).toBe(
        `${scheme}://[Filtered]@example.com/path`
      )
    }
  )
})

describe('compound credential keys', () => {
  it.each(['access_token', 'refresh_token', 'accessToken', 'client_secret'])(
    'redacts %s values in log and exception inputs',
    (key) => {
      const input = `${key}=sensitive-value`
      const expected = `${key}=[Filtered]`

      expect(scrubSentryLog({ message: input }).message).toBe(expected)
      expect(
        scrubSentryEvent({
          type: undefined,
          exception: { values: [{ value: input }] },
        })
      ).toEqual({
        type: undefined,
        exception: { values: [{ value: expected }] },
      })
    }
  )
})

describe('parseSentryTracesSampleRate', () => {
  it.each([
    [0, 0],
    ['0.25', 0.25],
    [' 0.5 ', 0.5],
    [1, 1],
  ])('accepts a sample rate within the inclusive range', (value, expected) => {
    expect(parseSentryTracesSampleRate(value)).toBe(expected)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
    ['a blank string', '   '],
    ['a negative number', -0.1],
    ['a number above one', 1.1],
    ['a non-numeric string', 'not-a-number'],
    ['false', false],
    ['true', true],
    ['an empty array', []],
    ['a numeric array', ['0.5']],
  ])('uses the fallback for %s', (_label, value) => {
    expect(parseSentryTracesSampleRate(value, 0.75)).toBe(0.75)
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

  it('scrubs strings inside nested arrays without mutating the source log', () => {
    const source = {
      message: 'Request failed',
      attributes: {
        attempts: [
          'GET /api/search?term=private',
          { authorization: 'Bearer secret', outcome: 'denied' },
        ],
      },
    }

    const log = scrubSentryLog(source)

    expect(log.attributes).toEqual({
      attempts: ['GET /api/search?[Filtered]', { authorization: '[Filtered]', outcome: 'denied' }],
    })
    expect(source.attributes.attempts).toEqual([
      'GET /api/search?term=private',
      { authorization: 'Bearer secret', outcome: 'denied' },
    ])
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
    expect(scrubServerSentryEvent(event, { originalException: { statusCode: 500 } })).toEqual(event)
  })

  it.each([300, 399, 400, 499])('drops an expected HTTP %i response', (statusCode) => {
    expect(
      scrubServerSentryEvent(
        { type: undefined, message: 'request failed' },
        { originalException: { statusCode } }
      )
    ).toBeNull()
  })

  it.each([299, 500])('retains and scrubs an HTTP %i response', (statusCode) => {
    expect(
      scrubServerSentryEvent(
        {
          type: undefined,
          user: { id: 'private-user' },
          message: 'Request failed token=secret',
        },
        { originalException: { statusCode } }
      )
    ).toEqual({ type: undefined, message: 'Request failed token=[Filtered]' })
  })

  it('drops the event using status 404 when statusCode is malformed', () => {
    expect(
      scrubServerSentryEvent(
        { type: undefined, message: 'request failed' },
        { originalException: { statusCode: 'unknown', status: 404 } }
      )
    ).toBeNull()
  })

  it('drops the event using a nested 429 status when statusCode is blank', () => {
    expect(
      scrubServerSentryEvent(
        { type: undefined, message: 'request failed' },
        { originalException: { statusCode: '', cause: { status: 429 } } }
      )
    ).toBeNull()
  })

  it('does not mutate the source event while removing request data', () => {
    const source = {
      type: undefined,
      user: { id: 'private-user' },
      request: {
        url: 'https://example.com/search?term=private',
        headers: { cookie: 'session=secret' },
      },
    }

    const event = scrubSentryEvent(source)

    expect(event).toEqual({
      type: undefined,
      request: { url: 'https://example.com/search?[Filtered]' },
    })
    expect(source).toEqual({
      type: undefined,
      user: { id: 'private-user' },
      request: {
        url: 'https://example.com/search?term=private',
        headers: { cookie: 'session=secret' },
      },
    })
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

  it('drops nested sensitive keys and scrubs every string in attribute arrays', () => {
    const span = scrubSentrySpan({
      trace_id: 'trace-id',
      span_id: 'span-id',
      start_timestamp: 1,
      data: {
        'http.request.header.authorization': 'Bearer secret',
        'app.allowed_urls': ['/api/items?owner=private', '/api/items/visible'],
      },
    })

    expect(span.data).toEqual({
      'app.allowed_urls': ['/api/items?[Filtered]', '/api/items/visible'],
    })
  })
})

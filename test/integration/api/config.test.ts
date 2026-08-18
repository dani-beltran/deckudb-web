import { getServerConfig } from '@server/config'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('getServerConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when a required environment variable is missing', () => {
    vi.stubEnv('CLAUDE_API_KEY', '')

    expect(() => getServerConfig()).toThrow(/claudeApiKey/)
  })

  it('returns the correct config when all required environment variables are present', () => {
    expect(() => getServerConfig()).not.toThrow()
  })

  it('throws when an environment variable has an invalid value', () => {
    vi.stubEnv('WORKER_ENABLED', 'not-a-boolean')

    expect(() => getServerConfig()).toThrow(/workerEnabled/)
  })

  it.each([
    ['RATE_LIMIT_MAX_REQUESTS', '0', /rateLimitMaxRequests/],
    ['RATE_LIMIT_TRUSTED_PROXY_HOPS', '11', /rateLimitTrustedProxyHops/],
    ['LOGIN_RATE_LIMIT_WINDOW_MS', '-1', /loginRateLimitWindowMs/],
  ])('rejects invalid rate-limit config in %s', (name, value, expectedError) => {
    vi.stubEnv(name, value)

    expect(() => getServerConfig()).toThrow(expectedError as RegExp)
  })
})

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

    it('applies rate-limit defaults when Nitro serializes unset runtime config as empty strings', () => {
    for (const name of [
      'RATE_LIMIT_ENABLED',
      'RATE_LIMIT_MAX_REQUESTS',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_TRUSTED_PROXY_HOPS',
      'LOGIN_RATE_LIMIT_MAX_REQUESTS',
      'LOGIN_RATE_LIMIT_WINDOW_MS',
    ]) {
      vi.stubEnv(`NUXT_${name}`, '')
    }

    expect(getServerConfig()).toMatchObject({
      rateLimitEnabled: true,
      rateLimitMaxRequests: 100,
      rateLimitWindowMs: 60_000,
      rateLimitTrustedProxyHops: 0,
      loginRateLimitMaxRequests: 5,
      loginRateLimitWindowMs: 15 * 60_000,
    })
  })
})

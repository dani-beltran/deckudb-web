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
    ['LOGIN_RATE_LIMIT_WINDOW_MS', '-1', /loginRateLimitWindowMs/],
    ['LOGIN_RATE_LIMIT_MAX_REQUESTS', '0', /loginRateLimitMaxRequests/],
    ['LOGIN_RATE_LIMIT_TRUSTED_PROXY_HOPS', '11', /loginRateLimitTrustedProxyHops/],
  ])('rejects invalid rate-limit config in %s', (name, value, expectedError) => {
    vi.stubEnv(name, value)

    expect(() => getServerConfig()).toThrow(expectedError as RegExp)
  })

  it('applies rate-limit defaults when Nitro serializes unset runtime config as empty strings', () => {
    for (const name of [
      'LOGIN_RATE_LIMIT_ENABLED',
      'LOGIN_RATE_LIMIT_MAX_REQUESTS',
      'LOGIN_RATE_LIMIT_WINDOW_MS',
      'LOGIN_RATE_LIMIT_TRUSTED_PROXY_HOPS',
    ]) {
      vi.stubEnv(`NUXT_${name}`, '')
    }

    expect(getServerConfig()).toMatchObject({
      loginRateLimitEnabled: true,
      loginRateLimitMaxRequests: 5,
      loginRateLimitWindowMs: 15 * 60_000,
      loginRateLimitTrustedProxyHops: 0,
    })
  })
})

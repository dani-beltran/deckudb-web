import { afterEach, describe, expect, it } from 'vitest'
import { getBackendConfig } from './'
import { vi } from 'vitest'


describe('getBackendConfig', () => {

  afterEach(() => {
    vi.unstubAllEnvs()
  })
  
  it('throws when a required environment variable is missing', () => {
    vi.stubEnv('NUXT_CLAUDE_API_KEY', '')

    expect(() => getBackendConfig()).toThrow(
      /claudeApiKey/
    )
  })

  it('returns the correct config when all required environment variables are present', () => {
    expect(() => getBackendConfig()).not.toThrow()
  })

  it('throws when an environment variable has an invalid value', () => {
    vi.stubEnv('NUXT_WORKER_ENABLED', 'not-a-boolean')

    expect(() => getBackendConfig()).toThrow(
      /workerEnabled/
    )
  })
})

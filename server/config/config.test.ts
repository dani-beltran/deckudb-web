import { afterEach, describe, expect, it } from 'vitest'
import { getServerConfig } from './'
import { vi } from 'vitest'


describe('getServerConfig', () => {

  afterEach(() => {
    vi.unstubAllEnvs()
  })
  
  it('throws when a required environment variable is missing', () => {
    vi.stubEnv('CLAUDE_API_KEY', '')

    expect(() => getServerConfig()).toThrow(
      /claudeApiKey/
    )
  })

  it('returns the correct config when all required environment variables are present', () => {
    expect(() => getServerConfig()).not.toThrow()
  })

  it('throws when an environment variable has an invalid value', () => {
    vi.stubEnv('WORKER_ENABLED', 'not-a-boolean')

    expect(() => getServerConfig()).toThrow(
      /workerEnabled/
    )
  })
})

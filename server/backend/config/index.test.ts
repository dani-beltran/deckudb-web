import { describe, expect, it, vi } from 'vitest'
import { useRuntimeConfig } from '#imports'
import { getBackendConfig } from './index'

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(),
}))

const validRuntimeConfig = {
  backendPort: '3000',
  nodeEnv: 'test',
  webHost: 'http://localhost:3000',
  mongodbUri: 'mongodb://localhost:27017/test',
  mongodbDatabase: 'test',
  claudeApiKey: 'test-claude-api-key',
  claudeAiModel: 'claude-haiku-4-5-20251001',
  firecrawlApiKey: 'test-firecrawl-api-key',
  sessionSecret: 'test-session-secret',
  sessionMaxAgeMs: '3600000',
  daysBetweenScrapes: '180',
  jobApiKey: 'test-job-api-key',
  jobTimeoutMinutes: '1',
  jobMaxAttempts: '3',
  workerPollIntervalMs: '10000',
  workerPollJitterMs: '1000',
  workerRequeueSweepMs: '60000',
  workerIdleLogEvery: '6',
  workerEnabled: false,
}

describe('getBackendConfig', () => {
  it('throws when a required environment variable is missing', () => {
    vi.mocked(useRuntimeConfig).mockReturnValue({
      ...validRuntimeConfig,
      claudeApiKey: undefined,
    })

    expect(getBackendConfig).toThrow(/claudeApiKey/)
  })
})

/**
 * Vitest replacement for Nuxt's `#imports` virtual module.
 *
 * Backend tests run outside Nitro, so Nuxt does not provide a request runtime
 * context. This keeps the same runtimeConfig shape and permits `NUXT_*`
 * values from `.env.test` to override the test defaults.
 */
export const useRuntimeConfig = () => ({
  backendPort: process.env.NUXT_BACKEND_PORT || '3000',
  nodeEnv: process.env.NUXT_NODE_ENV || 'test',
  webHost: process.env.NUXT_WEB_HOST || 'http://localhost:3000',
  mongodbUri: process.env.NUXT_MONGODB_URI || 'mongodb://localhost:27017/test',
  mongodbDatabase: process.env.NUXT_MONGODB_DATABASE || 'test',
  claudeApiKey: process.env.NUXT_CLAUDE_API_KEY || 'test-claude-api-key',
  claudeAiModel: process.env.NUXT_CLAUDE_AI_MODEL || 'claude-haiku-4-5-20251001',
  firecrawlApiKey: process.env.NUXT_FIRECRAWL_API_KEY || 'test-firecrawl-api-key',
  sessionSecret: process.env.NUXT_SESSION_SECRET || 'test-session-secret',
  sessionMaxAgeMs: process.env.NUXT_SESSION_MAX_AGE_MS || '3600000',
  daysBetweenScrapes: process.env.NUXT_DAYS_BETWEEN_SCRAPES || '180',
  jobApiKey: process.env.NUXT_JOB_API_KEY || 'test-job-api-key',
  jobTimeoutMinutes: process.env.NUXT_JOB_TIMEOUT_MINUTES || '1',
  jobMaxAttempts: process.env.NUXT_JOB_MAX_ATTEMPTS || '3',
  workerPollIntervalMs: process.env.NUXT_WORKER_POLL_INTERVAL_MS || '10000',
  workerPollJitterMs: process.env.NUXT_WORKER_POLL_JITTER_MS || '1000',
  workerRequeueSweepMs: process.env.NUXT_WORKER_REQUEUE_SWEEP_MS || '60000',
  workerIdleLogEvery: process.env.NUXT_WORKER_IDLE_LOG_EVERY || '6',
  workerEnabled: process.env.NUXT_WORKER_ENABLED === 'true',
  public: {
    apiBase: '/api',
  },
})

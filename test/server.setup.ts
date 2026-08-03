import { vi } from 'vitest'

// Mock the useRuntimeConfig for testing the server-side code.
// Server side tests don't use Nuxt's context and thus don't have access to 
// useRuntimeConfig, so we need to mock it.

const getRuntimeConfig = () => ({
  backendPort: process.env.NUXT_BACKEND_PORT,
  nodeEnv: process.env.NUXT_NODE_ENV,
  webHost: process.env.NUXT_WEB_HOST,
  mongodbUri: process.env.NUXT_MONGODB_URI,
  mongodbDatabase: process.env.NUXT_MONGODB_DATABASE,
  claudeApiKey: process.env.NUXT_CLAUDE_API_KEY,
  claudeAiModel: process.env.NUXT_CLAUDE_AI_MODEL,
  firecrawlApiKey: process.env.NUXT_FIRECRAWL_API_KEY,
  sessionSecret: process.env.NUXT_SESSION_SECRET,
  sessionMaxAgeMs: process.env.NUXT_SESSION_MAX_AGE_MS,
  daysBetweenScrapes: process.env.NUXT_DAYS_BETWEEN_SCRAPES,
  jobApiKey: process.env.NUXT_JOB_API_KEY,
  jobTimeoutMinutes: process.env.NUXT_JOB_TIMEOUT_MINUTES,
  jobMaxAttempts: process.env.NUXT_JOB_MAX_ATTEMPTS,
  workerPollIntervalMs: process.env.NUXT_WORKER_POLL_INTERVAL_MS,
  workerPollJitterMs: process.env.NUXT_WORKER_POLL_JITTER_MS,
  workerRequeueSweepMs: process.env.NUXT_WORKER_REQUEUE_SWEEP_MS,
  workerIdleLogEvery: process.env.NUXT_WORKER_IDLE_LOG_EVERY,
  workerEnabled: process.env.NUXT_WORKER_ENABLED,
  public: {
    apiBase: '/api',
  },
})

vi.mock('#imports', () => ({
  useRuntimeConfig: getRuntimeConfig,
}))

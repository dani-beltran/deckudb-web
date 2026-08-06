import z from 'zod'

const positiveInteger = z.coerce.number().int().positive()
const nonNegativeInteger = z.coerce.number().int().nonnegative()
const booleanFromRuntimeConfig = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true'))

/** Validated, server-only values declared in Nuxt's runtimeConfig. */
export const configSchema = z.object({
  // Runtime environment
  nodeEnv: z.string().trim().min(1),
  // Domain hosting the app
  webHost: z.url(),
  // Domain hosting the dashboard
  dashboardHost: z.url(),
  // MongoDB connection string
  mongodbUri: z.string().trim().min(1),
  // MongoDB database name
  mongodbDatabase: z.string().trim().min(1),
  // Claude API key for AI-powered features
  claudeApiKey: z.string().trim().min(1),
  // Claude model to use for AI-powered features
  claudeAiModel: z.string().trim().min(1),
  // Firecrawl API key for searching and scraping reports
  firecrawlApiKey: z.string().trim().min(1),
  // Session secret for signing session cookies
  sessionSecret: z.string().trim().min(10).max(100),
  // Session max age in milliseconds
  sessionMaxAgeMs: positiveInteger,
  // Days between scrapes for a game before it is considered stale and needs to be re-scraped
  daysBetweenScrapes: positiveInteger,
  // Job API key for internal job queueing from dashboard
  jobApiKey: z.string().trim().min(1),
  // Job timeout in minutes for jobs to complete before they are considered failed
  jobTimeoutMinutes: positiveInteger,
  // Job max attempts before a job is considered failed
  jobMaxAttempts: positiveInteger,
  // Job poll interval in milliseconds for the worker to check for new jobs
  workerPollIntervalMs: positiveInteger,
  // Job poll jitter in milliseconds to randomize the worker poll interval
  workerPollJitterMs: nonNegativeInteger,
  // Job requeue sweep interval in milliseconds for the worker to check for stuck jobs
  workerRequeueSweepMs: positiveInteger,
  // Job idle log interval in milliseconds for the worker to log when it is idle
  workerIdleLogEvery: positiveInteger,
  // Whether the worker is enabled to process jobs
  workerEnabled: booleanFromRuntimeConfig,
})

export type ServerConfig = z.infer<typeof configSchema>

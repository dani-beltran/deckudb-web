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
  // Port to listen on for HTTP requests
  port: positiveInteger,
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
  // Whether API rate limiting is enabled
  rateLimitEnabled: booleanFromRuntimeConfig.default(true),
  // Maximum requests per client in the general API sliding window
  rateLimitMaxRequests: positiveInteger.default(100),
  // General API sliding-window duration in milliseconds
  rateLimitWindowMs: positiveInteger.default(60_000),
  // Number of trusted reverse proxies that append to X-Forwarded-For
  rateLimitTrustedProxyHops: nonNegativeInteger.max(10).default(0),
  // Maximum login attempts per client in the stricter login sliding window
  loginRateLimitMaxRequests: positiveInteger.default(5),
  // Login sliding-window duration in milliseconds
  loginRateLimitWindowMs: positiveInteger.default(15 * 60_000),
  // Single-user dashboard credentials (server-only)
  adminUsername: z.string().trim().min(1).max(128),
  adminPassword: z.string().min(12).max(1024),
  // Days between scrapes for a game before it is considered stale and needs to be re-scraped
  daysBetweenScrapes: positiveInteger,
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

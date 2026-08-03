import z from 'zod'

const positiveInteger = z.coerce.number().int().positive()
const nonNegativeInteger = z.coerce.number().int().nonnegative()
const booleanFromRuntimeConfig = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true'))

/** Validated, server-only values declared in Nuxt's runtimeConfig. */
export const configSchema = z.object({
  backendPort: positiveInteger,
  nodeEnv: z.string().trim().min(1),
  webHost: z.url(),
  dashboardHost: z.url(),
  mongodbUri: z.string().trim().min(1),
  mongodbDatabase: z.string().trim().min(1),
  claudeApiKey: z.string().trim().min(1),
  claudeAiModel: z.string().trim().min(1),
  firecrawlApiKey: z.string().trim().min(1),
  sessionSecret: z.string().trim().min(10).max(100),
  sessionMaxAgeMs: positiveInteger,
  daysBetweenScrapes: positiveInteger,
  jobApiKey: z.string().trim().min(1),
  jobTimeoutMinutes: positiveInteger,
  jobMaxAttempts: positiveInteger,
  workerPollIntervalMs: positiveInteger,
  workerPollJitterMs: nonNegativeInteger,
  workerRequeueSweepMs: positiveInteger,
  workerIdleLogEvery: positiveInteger,
  workerEnabled: booleanFromRuntimeConfig,
})

export type BackendConfig = z.infer<typeof configSchema>

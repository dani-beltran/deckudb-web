// Make sure env variables are set
import dotenv from 'dotenv'
import { getRequired } from '../utils/collection'
import { parseValidInt } from '../utils/parse'

dotenv.config()

export enum NODE_ENVS {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Environment where the application is running.
 * Common values are "development", "production", and "test".
 * "development" enables features like more detailed logging.
 */
export const NODE_ENV =
  NODE_ENVS[process.env.NODE_ENV?.toUpperCase() as keyof typeof NODE_ENVS] || NODE_ENVS.DEVELOPMENT

/**
 * The port number on which the server will listen for incoming HTTP requests.
 */
export const PORT = parseValidInt(process.env.PORT || '3000')

/**
 * The base URL of the web frontend that will consume this API.
 * This is used in various places such as generating links in emails,
 * constructing redirect URLs, and configuring CORS.
 */
export const WEB_HOST = process.env.WEB_HOST || 'http://localhost:3001'

/**
 * The URI for connecting to the MongoDB database.
 * Keep this key secure and do not expose it in client-side code.
 */
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/steamdeckdb'

/**
 * The name of the MongoDB database to use.
 * This is typically specified in the MONGODB_URI, but can be overridden with this variable.
 */
export const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'steamdeckdb'

/**
 * API key for accessing the Claude AI service.
 * Used for generate game report summaries.
 * Keep this key secure and do not expose it in client-side code.
 */
export const CLAUDE_API_KEY = getRequired(process.env, 'CLAUDE_API_KEY', 'Environment variables')

/**
 * The specific Claude AI model to use for generating game reports.
 * Using a more advanced model may improve the quality of the generated summaries,
 * but could also increase response times and API costs.
 */
export const CLAUDE_AI_MODEL = process.env.CLAUDE_AI_MODEL || 'claude-haiku-4-5-20251001'

/**
 * API key for accessing the FireCrawl web crawling service.
 * Used for searching for game sources.
 * Keep this key secure and do not expose it in client-side code.
 */
export const FIRECRAWL_API_KEY = getRequired(
  process.env,
  'FIRECRAWL_API_KEY',
  'Environment variables'
)

/**
 * Comma-separated list of secrets used to sign session cookies.
 * Multiple secrets can be provided for key rotation purposes.
 * Keep this key secure and do not expose it in client-side code.
 */
export const SESSION_SECRETS = getRequired(process.env, 'SESSION_SECRET', 'Environment variables')
  .split(',')
  .map((secret) => secret.trim())
  .filter((secret) => secret.length > 0)

if (SESSION_SECRETS.length === 0) {
  console.error(
    'Error: SESSION_SECRET must contain at least one non-empty secret. Exiting application.'
  )
  process.exit(1)
}

/**
 * The maximum age of a session in milliseconds. This determines how long a user's session
 * will remain valid before it is automatically expired.
 */
export const SESSION_MAX_AGE_MS = parseValidInt(
  process.env.SESSION_MAX_AGE_MS || (30 * 24 * 60 * 60 * 1000).toString(),
  10
)

/**
 * The number of days after which a game's data should be re-scraped from the source.
 * Setting this too low may cause excessive scraping and API usage, while setting it
 * too high may result in outdated data being served to users.
 */
export const DAYS_BETWEEN_SCRAPES = parseValidInt(process.env.DAYS_BETWEEN_SCRAPES || '180', 10)

/**
 * The number of minutes after which a job is considered timed out if it has
 * not completed. Setting this too low may cause jobs to be marked as timed out
 * prematurely due to transient issues, while setting it too high may result in
 * delayed detection of truly stuck jobs.
 */
export const JOB_TIMEOUT_MINUTES = parseValidInt(process.env.JOB_TIMEOUT_MINUTES || '10', 10)

/**
 * The maximum number of attempts a job will be retried before it is
 * marked as failed. Setting this too low may cause jobs to fail prematurely
 * due to transient issues, while setting it too high may result in excessive
 * retries for truly failing jobs.
 */
export const JOB_MAX_ATTEMPTS = parseValidInt(process.env.JOB_MAX_ATTEMPTS || '3', 10)

/**
 * How often the worker should poll for new jobs when idle. Setting
 * this too low may cause excessive CPU usage, while setting it too
 * high may result in slower job processing.
 */
export const WORKER_POLL_INTERVAL_MS = parseValidInt(
  process.env.WORKER_POLL_INTERVAL_MS || '10000',
  10
)

/**
 * The overall purpose of jitter is to prevent the thundering herd problem,
 * where many workers polling at identical intervals would hammer a resource
 * simultaneously. By randomizing each worker's delay slightly, requests are
 * naturally spread out over time.
 */
export const WORKER_POLL_JITTER_MS = parseValidInt(process.env.WORKER_POLL_JITTER_MS || '1000', 10)

/**
 * How often the worker should check for and re-queue any jobs that have been
 * stuck in progress for too long (i.e. timed out). This is a safety mechanism to
 * ensure that if a worker crashes or gets stuck while processing a job, that job
 * will eventually be retried by another worker.
 */
export const WORKER_REQUEUE_SWEEP_MS = parseValidInt(
  process.env.WORKER_REQUEUE_SWEEP_MS || '60000',
  10
)

/**
 * How often the worker should log its idle status. This is useful for monitoring
 * purposes to ensure that workers are active and not stuck.
 */
export const WORKER_IDLE_LOG_EVERY = parseValidInt(process.env.WORKER_IDLE_LOG_EVERY || '6', 10)

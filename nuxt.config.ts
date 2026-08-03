import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-30',
  devtools: { enabled: true },
  srcDir: 'app/',
  ssr: false,
  css: ['~/styles/global.css'],
  alias: {
    '@assets': fileURLToPath(new URL('./app/assets', import.meta.url)),
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'DeckuDB - Optimize Every Game on the Steam Deck',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'The definitive aggregator of Steam Deck community reports and optimal game settings.',
        },
        { name: 'author', content: 'Daniel J.L. Beltran' },
        { name: 'robots', content: 'index, follow' },
        { name: 'theme-color', content: '#0370be' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://deckudb.com' },
        { property: 'og:title', content: 'DeckuDB - Optimize Every Game on the Steam Deck' },
        { property: 'og:image', content: 'https://deckudb.com/decku-og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon-256x256.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'canonical', href: 'https://deckudb.com' },
      ],
      script: [
        {
          id: 'Cookiebot',
          src: 'https://consent.cookiebot.com/uc.js',
          'data-cbid': '682f333a-218a-4fbd-9668-8586a8031083',
          'data-blockingmode': 'auto',
        },
        { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-DRQ2PH2JHN' },
      ],
    },
  },
  runtimeConfig: {
    // Private server-side configuration
    /** Port used by the legacy standalone Express server. */
    backendPort: process.env.PORT || '3000',
    /** Application environment; production enables production-only backend behavior. */
    nodeEnv: process.env.NODE_ENV || 'development',
    /** Base URL of the frontend, used to configure API CORS. */
    webHost: process.env.WEB_HOST || 'http://localhost:3001',
    /** Base URL of the dashboard, used to configure API CORS. */
    dashboardHost: process.env.DASHBOARD_HOST || 'http://localhost:4173',
    /** MongoDB connection URI. Keep this server-only. */
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/steamdeckdb',
    /** MongoDB database name. */
    mongodbDatabase: process.env.MONGODB_DATABASE || 'steamdeckdb',
    /** Anthropic API key used for game summary generation. Keep this server-only. */
    claudeApiKey: process.env.CLAUDE_API_KEY,
    /** Anthropic model used for game summary generation. */
    claudeAiModel: process.env.CLAUDE_AI_MODEL || 'claude-haiku-4-5-20251001',
    /** Firecrawl API key used to find game sources. Keep this server-only. */
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
    /** Comma-separated session signing secrets, allowing key rotation. Keep this server-only. */
    sessionSecret: process.env.SESSION_SECRET,
    /** Session lifetime in milliseconds. */
    sessionMaxAgeMs: process.env.SESSION_MAX_AGE_MS || (30 * 24 * 60 * 60 * 1000).toString(),
    /** Number of days before a game's data should be scraped again. */
    daysBetweenScrapes: process.env.DAYS_BETWEEN_SCRAPES || '180',
    /** API key required to access background-job endpoints. Keep this server-only. */
    jobApiKey: process.env.JOB_API_KEY,
    /** Minutes after which an unfinished job is treated as timed out. */
    jobTimeoutMinutes: process.env.JOB_TIMEOUT_MINUTES || '10',
    /** Maximum attempts before a failed job is permanently marked as failed. */
    jobMaxAttempts: process.env.JOB_MAX_ATTEMPTS || '3',
    /** Idle worker polling interval in milliseconds. */
    workerPollIntervalMs: process.env.WORKER_POLL_INTERVAL_MS || '10000',
    /** Maximum random delay added to worker polling, in milliseconds. */
    workerPollJitterMs: process.env.WORKER_POLL_JITTER_MS || '1000',
    /** Interval in milliseconds for re-queuing timed-out jobs. */
    workerRequeueSweepMs: process.env.WORKER_REQUEUE_SWEEP_MS || '60000',
    /** Number of idle polls between worker status log entries. */
    workerIdleLogEvery: process.env.WORKER_IDLE_LOG_EVERY || '6',
    /** Whether the background queue worker starts with the Nitro server. */
    workerEnabled: process.env.NODE_ENV === 'production',
    // Public runtime configuration.
    public: {
      apiBase: '/api',
    },
  },
  nitro: {
    experimental: {
      tasks: true,
    },
  },
})

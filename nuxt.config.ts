import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'
import { getEnvConfig } from './server/config/env'
import { parseSentryTracesSampleRate } from './shared/sentry'

const sentryDsn = process.env.NUXT_PUBLIC_SENTRY_DSN ?? ''
const sentryEnvironment = process.env.NUXT_NODE_ENV ?? process.env.NODE_ENV ?? 'development'
const sentryTracesSampleRate = parseSentryTracesSampleRate(
  process.env.NUXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
)
const uploadSentrySourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
)

export default defineNuxtConfig({
  compatibilityDate: '2026-07-30',
  devtools: { enabled: true },
  srcDir: 'app/',
  ssr: false,
  modules: ['@sentry/nuxt/module'],
  sourcemap: uploadSentrySourceMaps ? { client: 'hidden', server: 'hidden' } : false,
  sentry: {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    release: process.env.SENTRY_RELEASE ? { name: process.env.SENTRY_RELEASE } : undefined,
    sourcemaps: {
      disable: !uploadSentrySourceMaps,
      filesToDeleteAfterUpload: uploadSentrySourceMaps ? ['.output/**/*.map'] : undefined,
    },
  },
  css: ['normalize.css', '~/styles/global.css'],
  alias: {
    '@server': fileURLToPath(new URL('./server', import.meta.url)),
    '@app': fileURLToPath(new URL('./app', import.meta.url)),
    '@assets': fileURLToPath(new URL('./app/assets', import.meta.url)),
    '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
  },
  typescript: {
    tsConfig: {
      include: ['../test/**/*'],
    },
  },
  imports: {
    autoImport: false,
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
          type: 'text/javascript',
          async: true,
        },
        {
          src: 'https://www.googletagmanager.com/gtag/js?id=G-DRQ2PH2JHN',
          type: 'text/plain',
          'data-cookieconsent': 'statistics',
          async: true,
        },
      ],
    },
  },
  runtimeConfig: {
    ...getEnvConfig(),
    public: {
      apiBase: '/api',
      sentry: {
        dsn: sentryDsn,
        environment: sentryEnvironment,
        tracesSampleRate: sentryTracesSampleRate,
      },
    },
  },
  nitro: {
    experimental: {
      tasks: true,
    },
  },
  vite: {
    optimizeDeps: {
      include: ['@vue/devtools-core', '@vue/devtools-kit', 'lucide-vue-next', 'hls.js'],
    },
  },
})

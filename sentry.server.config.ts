import * as Sentry from '@sentry/nuxt'
import {
  parseSentryTracesSampleRate,
  scrubSentryLog,
  scrubSentrySpan,
  scrubServerSentryEvent,
  sentryDataCollection,
} from './shared/sentry'

const dsn = process.env.NUXT_PUBLIC_SENTRY_DSN
const environment = process.env.NUXT_NODE_ENV ?? process.env.NODE_ENV
const sampleRate = parseSentryTracesSampleRate(process.env.NUXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && environment !== 'test',
  environment,
  enableLogs: true,
  dataCollection: sentryDataCollection,
  // Downstream services are third-party APIs, so retain spans without forwarding trace headers.
  tracePropagationTargets: [],
  tracesSampler: ({ name, inheritOrSampleWith }) =>
    name.includes('/api/health') ? 0 : inheritOrSampleWith(sampleRate),
  beforeSend: scrubServerSentryEvent,
  beforeSendLog: scrubSentryLog,
  beforeSendSpan: scrubSentrySpan,
})

import * as Sentry from '@sentry/nuxt'
import { useRuntimeConfig } from '#imports'
import {
  parseSentryTracesSampleRate,
  scrubSentryEvent,
  scrubSentryLog,
  scrubSentrySpan,
  sentryDataCollection,
} from './shared/sentry'

const runtimeConfig = useRuntimeConfig()
const { dsn, environment, tracesSampleRate } = runtimeConfig.public.sentry
const sampleRate = parseSentryTracesSampleRate(tracesSampleRate)

Sentry.init({
  dsn: dsn || undefined,
  tunnel: dsn ? '/api/tunnel' : undefined,
  enabled: Boolean(dsn) && environment !== 'test',
  environment,
  enableLogs: true,
  dataCollection: sentryDataCollection,
  tracePropagationTargets: [/^\/api(?:\/|$)/],
  tracesSampler: ({ name, inheritOrSampleWith }) =>
    name.includes('/api/health') ? 0 : inheritOrSampleWith(sampleRate),
  integrations: [
    Sentry.consoleLoggingIntegration({
      // Informational browser logs include noisy Web Vitals already handled by tracing.
      levels: ['warn', 'error'],
    }),
  ],
  beforeSend: scrubSentryEvent,
  beforeSendLog: scrubSentryLog,
  beforeSendSpan: scrubSentrySpan,
})

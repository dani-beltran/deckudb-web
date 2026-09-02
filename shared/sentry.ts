import type { NodeOptions } from '@sentry/node'
import type { ErrorEvent, EventHint } from '@sentry/nuxt'

import { redactRecord, redactText } from './redaction'

type SentrySpan = Parameters<NonNullable<NodeOptions['beforeSendSpan']>>[0]

const DEFAULT_SENTRY_TRACES_SAMPLE_RATE = 0.1
const SENSITIVE_SPAN_ATTRIBUTE_PATTERN =
  /(?:^|[._-])(?:authorization|cookie|credential|password|passwd|secret|session|token|api[-_]?key|query(?:[-_]?string|[-_]?params)?|user(?:[-_]?(?:id|identity|name))?|email(?:[-_]?address)?|(?:client[-_]?)?ip(?:[-_]?address)?|remote[-_]?address)(?:$|[._-])/i

/** Privacy-first defaults for telemetry collected automatically by the Sentry SDK. */
export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: false,
    response: false,
  },
  httpBodies: [],
  urlQueryParams: false,
  graphQL: {
    document: false,
    variables: false,
  },
  genAI: {
    inputs: false,
    outputs: false,
  },
  databaseQueryData: false,
  stackFrameVariables: false,
}

export function parseSentryTracesSampleRate(
  value: unknown,
  fallback = DEFAULT_SENTRY_TRACES_SAMPLE_RATE
): number {
  if (typeof value !== 'number' && typeof value !== 'string') return fallback
  if (typeof value === 'string' && value.trim() === '') return fallback

  const sampleRate = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(sampleRate) && sampleRate >= 0 && sampleRate <= 1 ? sampleRate : fallback
}

type SentryLog = {
  message: unknown
  attributes?: Record<string, unknown>
}

/** Removes common credential fields from application-authored log messages and attributes. */
export function scrubSentryLog<T extends SentryLog>(log: T): T {
  const message = typeof log.message === 'string' ? redactText(log.message) : log.message

  if (!log.attributes) return { ...log, message }

  return {
    ...log,
    message,
    attributes: redactRecord(log.attributes),
  }
}

/** Scrubs application-authored event data which is not covered by automatic collection controls. */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed = redactRecord(event as unknown as Record<string, unknown>)

  // Keep known Sentry event fields schema-valid while removing custom request and identity data.
  delete scrubbed.user
  if (
    scrubbed.request &&
    typeof scrubbed.request === 'object' &&
    !Array.isArray(scrubbed.request)
  ) {
    const request = scrubbed.request as Record<string, unknown>
    delete request.cookies
    delete request.data
    delete request.env
    delete request.headers
    delete request.query_string
  }

  return scrubbed as unknown as ErrorEvent
}

/** Drops expected HTTP failures and scrubs all remaining server error events. */
export function scrubServerSentryEvent(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  const statusCode = getHttpStatusCode(hint?.originalException)
  if (statusCode !== undefined && statusCode >= 300 && statusCode < 500) return null
  return scrubSentryEvent(event)
}

/** Removes query strings, credentials, and identity attributes from performance spans. */
export function scrubSentrySpan(span: SentrySpan): SentrySpan {
  const data: SentrySpan['data'] = {}
  for (const [key, value] of Object.entries(span.data)) {
    if (!SENSITIVE_SPAN_ATTRIBUTE_PATTERN.test(key)) {
      data[key] = redactSpanAttributeValue(value)
    }
  }

  return {
    ...span,
    description: span.description ? redactText(span.description) : span.description,
    data,
  }
}

function redactSpanAttributeValue(value: SentrySpan['data'][string]): SentrySpan['data'][string] {
  if (typeof value === 'string') return redactText(value)
  if (Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === 'string' ? redactText(entry) : entry
    ) as SentrySpan['data'][string]
  }
  return value
}

function getHttpStatusCode(value: unknown, depth = 0): number | undefined {
  if (!value || typeof value !== 'object' || depth > 3) return undefined
  const error = value as { cause?: unknown; status?: unknown; statusCode?: unknown }
  const statusCode = parseHttpStatusCode(error.statusCode) ?? parseHttpStatusCode(error.status)
  if (statusCode !== undefined) return statusCode
  return getHttpStatusCode(error.cause, depth + 1)
}

function parseHttpStatusCode(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined

  const statusCode = Number(value)
  return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
    ? statusCode
    : undefined
}

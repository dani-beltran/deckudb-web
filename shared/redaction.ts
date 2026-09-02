const REDACTED_VALUE = '[Filtered]'
const SENSITIVE_ATTRIBUTE_PATTERN =
  /(?:authorization|cookie|credential|password|passwd|secret|session|token|api[-_]?key|query(?:[-_]?string|[-_]?params)?)|^(?:user(?:[-_]?(?:id|identity|name))?|email(?:[-_]?address)?|(?:client[-_]?)?ip(?:[-_]?address)?|remote[-_]?address)$/i
const SENSITIVE_TEXT_PATTERN =
  /(\b(?:authorization|cookie|credential|password|passwd|secret|session(?:[-_]?id)?|token|api[-_]?key|user(?:[-_]?(?:id|identity|name))?|email(?:[-_]?address)?|(?:client[-_]?)?ip(?:[-_]?address)?|remote[-_]?address)\b\s*[:=]\s*)(?:"[^"]*"|'[^']*'|(?:basic|bearer)\s+[^\s,;]+|[^\s,;]+)/gi
const URL_CREDENTIALS_PATTERN = /(\b(?:https?|mongodb(?:\+srv)?):\/\/)[^/\s:@]+(?::[^@\s/]+)?@/gi
const URL_QUERY_PATTERN = /((?:[a-z][a-z0-9+.-]*:\/\/|\/)[^\s"'<>?]+)\?[^\s"'<>]*/gi

/** Redacts sensitive information from a given record. */
export function redactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      SENSITIVE_ATTRIBUTE_PATTERN.test(key) ? REDACTED_VALUE : redactValue(value),
    ])
  )
}

/** Redacts sensitive information from a given value. */
export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redactText(value)
  if (Array.isArray(value)) return value.map(redactValue)
  if (!isPlainRecord(value)) return value
  return redactRecord(value)
}

/** Redacts sensitive information from a given text value. */
export function redactText(value: string): string {
  return value
    .replace(URL_CREDENTIALS_PATTERN, `$1${REDACTED_VALUE}@`)
    .replace(URL_QUERY_PATTERN, `$1?${REDACTED_VALUE}`)
    .replace(SENSITIVE_TEXT_PATTERN, `$1${REDACTED_VALUE}`)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

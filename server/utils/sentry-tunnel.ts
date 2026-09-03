type SentryDsn = {
  host: string
  pathPrefix: string
  projectId: string
  protocol: string
  publicKey: string
}

function parseSentryDsn(value: string): SentryDsn {
  const url = new URL(value)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const projectId = pathSegments.pop()

  if (!['http:', 'https:'].includes(url.protocol) || !url.username || !projectId) {
    throw new Error('Invalid Sentry DSN')
  }

  return {
    host: url.host,
    pathPrefix: pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '',
    projectId,
    protocol: url.protocol,
    publicKey: url.username,
  }
}

function getEnvelopeDsn(envelope: Uint8Array): string {
  const newlineIndex = envelope.indexOf(10)
  const headerBytes = newlineIndex === -1 ? envelope : envelope.subarray(0, newlineIndex)
  const header = JSON.parse(new TextDecoder().decode(headerBytes)) as { dsn?: unknown }

  if (typeof header.dsn !== 'string') {
    throw new Error('Sentry envelope header has no DSN')
  }

  return header.dsn
}

/** Resolves a Sentry envelope URL only when its DSN matches the configured project. */
export function getSentryTunnelTarget(envelope: Uint8Array, configuredDsn: string): string {
  const allowed = parseSentryDsn(configuredDsn)
  const requested = parseSentryDsn(getEnvelopeDsn(envelope))

  if (
    requested.protocol !== allowed.protocol ||
    requested.host !== allowed.host ||
    requested.pathPrefix !== allowed.pathPrefix ||
    requested.projectId !== allowed.projectId ||
    requested.publicKey !== allowed.publicKey
  ) {
    throw new Error('Sentry envelope DSN is not allowed')
  }

  return `${allowed.protocol}//${allowed.host}${allowed.pathPrefix}/api/${allowed.projectId}/envelope/`
}

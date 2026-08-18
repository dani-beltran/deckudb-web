import { createHash } from 'node:crypto'
import {
  createError,
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
  setResponseHeader,
} from 'h3'
import { getServerConfig, type ServerConfig } from '../config'

type RateLimitConfig = Pick<
  ServerConfig,
  | 'loginRateLimitMaxRequests'
  | 'loginRateLimitWindowMs'
  | 'rateLimitEnabled'
  | 'rateLimitMaxRequests'
  | 'rateLimitTrustedProxyHops'
  | 'rateLimitWindowMs'
>

type RateLimitPolicy = {
  limit: number
  name: 'api' | 'login'
  windowMs: number
}

const LOGIN_PATH = '/api/admin/auth/login'
const EXEMPT_PATHS = new Set(['/api/health'])

function getPolicy(pathname: string, config: RateLimitConfig): RateLimitPolicy {
  if (pathname === LOGIN_PATH) {
    return {
      limit: config.loginRateLimitMaxRequests,
      name: 'login',
      windowMs: config.loginRateLimitWindowMs,
    }
  }

  return {
    limit: config.rateLimitMaxRequests,
    name: 'api',
    windowMs: config.rateLimitWindowMs,
  }
}

function getSocketAddress(event: Parameters<typeof getRequestURL>[0]) {
  return event.node.req.socket.remoteAddress ?? 'unknown'
}

/** Returns a client address without trusting spoofable forwarding headers by default. */
export function getRateLimitClientAddress(
  event: Parameters<typeof getRequestURL>[0],
  trustedProxyHops: number
) {
  if (trustedProxyHops === 0) return getSocketAddress(event)

  const forwardedAddresses = getRequestHeader(event, 'x-forwarded-for')
    ?.split(',')
    .map((address) => address.trim())
    .filter(Boolean)

  if (!forwardedAddresses || forwardedAddresses.length < trustedProxyHops) {
    return getSocketAddress(event)
  }

  return forwardedAddresses[forwardedAddresses.length - trustedProxyHops] ?? getSocketAddress(event)
}

function getPartitionKey(policyName: string, clientAddress: string) {
  return createHash('sha256').update(`${policyName}:${clientAddress}`).digest('hex')
}

function setRateLimitHeaders(
  event: Parameters<typeof setResponseHeader>[0],
  policy: RateLimitPolicy,
  remaining: number,
  resetSeconds: number
) {
  const windowSeconds = Math.ceil(policy.windowMs / 1000)
  setResponseHeader(
    event,
    'RateLimit-Policy',
    `"${policy.name}";q=${policy.limit};w=${windowSeconds}`
  )
  setResponseHeader(event, 'RateLimit', `"${policy.name}";r=${remaining};t=${resetSeconds}`)
}

/** Creates the API limiter handler. Config injection keeps policy tests isolated from process env. */
export function createRateLimitMiddleware(getConfig: () => RateLimitConfig = getServerConfig) {
  return defineEventHandler(async (event) => {
    const pathname = getRequestURL(event).pathname
    if (event.method === 'OPTIONS' || !pathname.startsWith('/api/') || EXEMPT_PATHS.has(pathname)) {
      return
    }

    const config = getConfig()
    if (!config.rateLimitEnabled) return

    const policy = getPolicy(pathname, config)
    const clientAddress = getRateLimitClientAddress(event, config.rateLimitTrustedProxyHops)
    const result = await event.context.repositories.rateLimits.consume(
      getPartitionKey(policy.name, clientAddress),
      policy
    )

    setRateLimitHeaders(event, policy, result.remaining, result.resetSeconds)
    if (result.allowed) return

    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    setResponseHeader(event, 'Retry-After', result.resetSeconds)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: {
        error: 'Too Many Requests',
        retryAfter: result.resetSeconds,
      },
    })
  })
}

export default createRateLimitMiddleware()

import { createHash } from 'node:crypto'
import {
  createError,
  defineEventHandler,
  getRequestHeader,
  getRequestURL,
  setResponseHeader,
} from 'h3'
import { getServerConfig, type ServerConfig } from '../config'

type LoginRateLimitConfig = Pick<
  ServerConfig,
  | 'loginRateLimitEnabled'
  | 'loginRateLimitMaxRequests'
  | 'loginRateLimitTrustedProxyHops'
  | 'loginRateLimitWindowMs'
>

const LOGIN_PATH = '/api/admin/auth/login'

function getSocketAddress(event: Parameters<typeof getRequestURL>[0]) {
  return event.node.req.socket.remoteAddress ?? 'unknown'
}

/** Resolves a login client IP without trusting forwarding headers unless explicitly configured. */
export function getLoginRateLimitClientAddress(
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

function getPartitionKey(clientAddress: string) {
  return createHash('sha256').update(`login-ip:${clientAddress}`).digest('hex')
}

/** Creates the IP-based login limiter. Config injection keeps policy tests isolated from env. */
export function createRateLimitMiddleware(getConfig: () => LoginRateLimitConfig = getServerConfig) {
  return defineEventHandler(async (event) => {
    if (event.method !== 'POST' || getRequestURL(event).pathname !== LOGIN_PATH) return

    const config = getConfig()
    if (!config.loginRateLimitEnabled) return

    const clientAddress = getLoginRateLimitClientAddress(
      event,
      config.loginRateLimitTrustedProxyHops
    )
    const result = await event.context.repositories.rateLimits.consume(
      getPartitionKey(clientAddress),
      {
        limit: config.loginRateLimitMaxRequests,
        windowMs: config.loginRateLimitWindowMs,
      }
    )
    const windowSeconds = Math.ceil(config.loginRateLimitWindowMs / 1000)

    setResponseHeader(
      event,
      'RateLimit-Policy',
      `"login-ip";q=${config.loginRateLimitMaxRequests};w=${windowSeconds}`
    )
    setResponseHeader(
      event,
      'RateLimit',
      `"login-ip";r=${result.remaining};t=${result.resetSeconds}`
    )
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

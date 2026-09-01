import { createHash, timingSafeEqual } from 'node:crypto'
import { createError, type H3Event } from 'h3'
import { getServerConfig } from '../config'
import { destroySession, rotateSession } from './session'

function digest(value: string) {
  return createHash('sha256').update(value, 'utf8').digest()
}

function timingSafeStringEqual(received: string, expected: string) {
  return timingSafeEqual(digest(received), digest(expected))
}

export function isAdminAuthenticated(event: H3Event) {
  return event.context.session?.data.adminAuthenticated === true
}

/** Returns a stable, non-secret identity for admin audit records. */
export function getAdminIdentity(event: H3Event) {
  const sessionUsername = event.context.session?.data.adminUsername
  if (typeof sessionUsername === 'string' && sessionUsername) return sessionUsername
  return 'anonymous'
}

/** Validates both fields without short-circuiting either timing-safe comparison. */
export function requireValidAdminCredentials(username: string, password: string) {
  const { adminPassword, adminUsername } = getServerConfig()
  const usernameMatches = timingSafeStringEqual(username, adminUsername)
  const passwordMatches = timingSafeStringEqual(password, adminPassword)

  if (!usernameMatches || !passwordMatches) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { error: 'Unauthorized' },
    })
  }
}

export async function authenticateAdmin(event: H3Event, username: string) {
  await rotateSession(event, {
    adminAuthenticated: true,
    adminAuthenticatedAt: Date.now(),
    adminUsername: username,
  })
}

export async function logoutAdmin(event: H3Event) {
  await destroySession(event)
}

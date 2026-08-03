import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { defineEventHandler, getCookie, setCookie } from 'h3'
import { useStorage } from 'nitropack/runtime/internal/storage'
import { getBackendConfig } from '../config'

const cookieName = 'decku.sid'
const sessionKeyPrefix = 'session:'
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const signaturePattern = /^[A-Za-z0-9_-]{43}$/

type StoredSession = {
  id: string
  data: Record<string, unknown>
  createdAt: number
  expiresAt: number
}

type Session = StoredSession

declare module 'h3' {
  interface H3EventContext {
    session?: Session
  }
}

function sign(sessionId: string, secret: string) {
  return createHmac('sha256', secret).update(sessionId).digest('base64url')
}

function hasValidSignature(sessionId: string, signature: string, secret: string) {
  const received = Buffer.from(signature, 'base64url')

  const expected = Buffer.from(sign(sessionId, secret), 'base64url')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

function getSignedSessionId(event: Parameters<typeof getCookie>[0], secret: string) {
  const value = getCookie(event, cookieName)
  if (!value) return

  const [sessionId, signature, ...rest] = value.split('.')
  if (!sessionId || !signature || rest.length > 0) return
  if (!sessionIdPattern.test(sessionId) || !signaturePattern.test(signature)) return

  return hasValidSignature(sessionId, signature, secret) ? sessionId : undefined
}

function setSignedSessionCookie(event: Parameters<typeof setCookie>[0], sessionId: string) {
  const { nodeEnv, sessionMaxAgeMs, sessionSecret } = getBackendConfig()

  setCookie(event, cookieName, `${sessionId}.${sign(sessionId, sessionSecret)}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    maxAge: Math.floor(sessionMaxAgeMs / 1000),
  })
}

/** Initializes a signed, server-side MongoDB session for API requests. */
export default defineEventHandler(async (event) => {
  if (event.method === 'OPTIONS' || !event.path.startsWith('/api/')) return

  const { sessionMaxAgeMs, sessionSecret } = getBackendConfig()
  const sessions = useStorage<StoredSession>('mongo')
  const sessionId = getSignedSessionId(event, sessionSecret)
  const key = sessionId ? `${sessionKeyPrefix}${sessionId}` : undefined
  const session = key ? await sessions.getItem(key) : null

  if (session && session.expiresAt > Date.now()) {
    event.context.session = session
    return
  }

  if (key && session) await sessions.removeItem(key)

  const id = randomUUID()
  const createdAt = Date.now()
  const newSession: StoredSession = {
    id,
    data: {},
    createdAt,
    expiresAt: createdAt + sessionMaxAgeMs,
  }

  await sessions.setItem(`${sessionKeyPrefix}${id}`, newSession)
  setSignedSessionCookie(event, id)
  event.context.session = newSession
})

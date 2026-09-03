import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { UIMessage } from 'ai'
import type { H3Event } from 'h3'
import { deleteCookie, getCookie, setCookie } from 'h3'
import { useStorage } from 'nitropack/runtime/internal/storage'
import { getServerConfig } from '../config/index'

const cookieName = 'decku.sid'
const sessionKeyPrefix = 'session:'
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const signaturePattern = /^[A-Za-z0-9_-]{43}$/

export type SessionData = Record<string, unknown> & {
  adminAuthenticated?: boolean
  adminAuthenticatedAt?: number
  adminUsername?: string
  supportChatMessages?: UIMessage[]
}

export type StoredSession = {
  id: string
  data: SessionData
  createdAt: number
  expiresAt: number
}

declare module 'h3' {
  interface H3EventContext {
    session?: StoredSession
  }
}

function getSessionStorage() {
  return useStorage<StoredSession>('mongo')
}

function getSessionKey(sessionId: string) {
  return `${sessionKeyPrefix}${sessionId}`
}

function sign(sessionId: string, secret: string) {
  return createHmac('sha256', secret).update(sessionId).digest('base64url')
}

function hasValidSignature(sessionId: string, signature: string, secret: string) {
  const received = Buffer.from(signature, 'base64url')
  const expected = Buffer.from(sign(sessionId, secret), 'base64url')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

function getSignedSessionId(event: H3Event, secret: string) {
  const value = getCookie(event, cookieName)
  if (!value) return

  const [sessionId, signature, ...rest] = value.split('.')
  if (!sessionId || !signature || rest.length > 0) return
  if (!sessionIdPattern.test(sessionId) || !signaturePattern.test(signature)) return

  return hasValidSignature(sessionId, signature, secret) ? sessionId : undefined
}

function setSignedSessionCookie(event: H3Event, sessionId: string) {
  const { nodeEnv, sessionMaxAgeMs, sessionSecret } = getServerConfig()

  setCookie(event, cookieName, `${sessionId}.${sign(sessionId, sessionSecret)}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: nodeEnv === 'production',
    maxAge: Math.floor(sessionMaxAgeMs / 1000),
  })
}

function buildSession(data: SessionData = {}): StoredSession {
  const { sessionMaxAgeMs } = getServerConfig()
  const createdAt = Date.now()
  return {
    id: randomUUID(),
    data,
    createdAt,
    expiresAt: createdAt + sessionMaxAgeMs,
  }
}

async function createSession(event: H3Event, data: SessionData = {}) {
  const session = buildSession(data)

  await getSessionStorage().setItem(getSessionKey(session.id), session)
  setSignedSessionCookie(event, session.id)
  event.context.session = session
  return session
}

/** Loads a valid server-side session and optionally creates one when none exists. */
export async function loadSession(event: H3Event, createIfMissing = true) {
  if (event.context.session?.expiresAt && event.context.session.expiresAt > Date.now()) {
    return event.context.session
  }

  const { sessionSecret } = getServerConfig()
  const sessionId = getSignedSessionId(event, sessionSecret)
  const session = sessionId ? await getSessionStorage().getItem(getSessionKey(sessionId)) : null

  if (session && session.expiresAt > Date.now()) {
    event.context.session = session
    return session
  }

  if (sessionId && session) await getSessionStorage().removeItem(getSessionKey(sessionId))
  delete event.context.session

  return createIfMissing ? createSession(event) : undefined
}

/** Persists changes made to the session attached to this request. */
export async function saveSession(event: H3Event) {
  const session = event.context.session
  if (!session) throw new Error('Session middleware is not configured')
  await getSessionStorage().setItem(getSessionKey(session.id), session)
}

/** Replaces the current session ID to prevent session fixation after authentication. */
export async function rotateSession(event: H3Event, data: SessionData = {}) {
  const previousSessionId = event.context.session?.id
  const session = buildSession(data)
  const sessions = getSessionStorage()

  await sessions.setItem(getSessionKey(session.id), session)

  if (previousSessionId && previousSessionId !== session.id) {
    try {
      await sessions.removeItem(getSessionKey(previousSessionId))
    } catch (error) {
      await sessions.removeItem(getSessionKey(session.id)).catch(() => undefined)
      throw error
    }
  }

  setSignedSessionCookie(event, session.id)
  event.context.session = session
  return session
}

/** Removes the current server-side session and expires its browser cookie. */
export async function destroySession(event: H3Event) {
  const sessionId = event.context.session?.id
  if (sessionId) await getSessionStorage().removeItem(getSessionKey(sessionId))
  delete event.context.session
  deleteCookie(event, cookieName, { path: '/' })
}

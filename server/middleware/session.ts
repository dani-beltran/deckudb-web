import { normalizePath } from '@shared/uri'
import {
  createError,
  defineEventHandler,
  type EventHandlerRequest,
  getRequestURL,
  type H3Event,
  sendRedirect,
  setResponseHeader,
} from 'h3'
import { isAdminAuthenticated } from '../utils/admin-auth'
import { loadSession } from '../utils/session'

const publicAdminAuthRequests = new Set([
  'POST /api/admin/auth/login',
  'GET /api/admin/auth/session',
  'POST /api/admin/auth/logout',
])

function isAdminPage(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function isAdminApi(pathname: string) {
  return pathname === '/api/admin' || pathname.startsWith('/api/admin/')
}

function isLoginPage(pathname: string) {
  return normalizePath(pathname) === '/admin/login'
}

async function handleSessionForPage(event: H3Event<EventHandlerRequest>) {
  const requestUrl = getRequestURL(event)
  const pathname = requestUrl.pathname

  if ((event.method === 'GET' || event.method === 'HEAD') && isAdminPage(pathname)) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    await loadSession(event, false)

    if (isLoginPage(pathname)) {
      if (isAdminAuthenticated(event)) return sendRedirect(event, '/admin', 302)
      return
    }

    if (!isAdminAuthenticated(event)) {
      const returnPath = `${pathname}${requestUrl.search}`
      return sendRedirect(event, `/admin/login?redirect=${encodeURIComponent(returnPath)}`, 302)
    }
    return
  }
}

async function handleSessionForApiRequest(event: H3Event<EventHandlerRequest>) {
  const requestUrl = getRequestURL(event)
  const pathname = requestUrl.pathname

  if (!pathname.startsWith('/api/')) return

  const isLogoutRequest = event.method === 'POST' && pathname === '/api/admin/auth/logout'
  await loadSession(event, !isLogoutRequest)

  if (!isAdminApi(pathname)) return
  setResponseHeader(event, 'Cache-Control', 'no-store')

  if (!publicAdminAuthRequests.has(`${event.method} ${pathname}`) && !isAdminAuthenticated(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { error: 'Unauthorized' },
    })
  }
}

/** Initializes API sessions and protects admin pages and API routes. */
export default defineEventHandler(async (event) => {
  if (event.method === 'OPTIONS') return

  const pathname = getRequestURL(event).pathname

  if (pathname.startsWith('/api/')) {
    return handleSessionForApiRequest(event)
  } else {
    return handleSessionForPage(event)
  }
})

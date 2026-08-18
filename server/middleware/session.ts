import { createError, defineEventHandler, getRequestURL, sendRedirect, setResponseHeader } from 'h3'
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

/** Initializes API sessions and protects admin pages and API routes. */
export default defineEventHandler(async (event) => {
  if (event.method === 'OPTIONS') return

  const requestUrl = getRequestURL(event)
  const pathname = requestUrl.pathname
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if ((event.method === 'GET' || event.method === 'HEAD') && isAdminPage(normalizedPathname)) {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    await loadSession(event, false)

    if (normalizedPathname === '/admin/login') {
      if (isAdminAuthenticated(event)) return sendRedirect(event, '/admin', 302)
      return
    }

    if (!isAdminAuthenticated(event)) {
      const returnPath = `${pathname}${requestUrl.search}`
      return sendRedirect(event, `/admin/login?redirect=${encodeURIComponent(returnPath)}`, 302)
    }
    return
  }

  if (!pathname.startsWith('/api/')) return
  await loadSession(event)

  if (!isAdminApi(pathname)) return
  setResponseHeader(event, 'Cache-Control', 'no-store')

  if (!publicAdminAuthRequests.has(`${event.method} ${pathname}`) && !isAdminAuthenticated(event)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { error: 'Unauthorized' },
    })
  }
})

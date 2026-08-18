import { useRuntimeConfig } from '#imports'

const DEFAULT_ADMIN_ROUTE = '/admin'
const ADMIN_PATH_PATTERN = /^\/admin(?:\/|$)/

/**
 * Sanitizes a redirect URL for the admin panel. 
 * Ensures that the URL is a valid path within the admin section of the application.
 */
export function sanitizeAdminRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_ADMIN_ROUTE
  }

  try {
    const config = useRuntimeConfig()
    const base = new URL(config.public.webHost)
    const redirect = new URL(value, base)
    if (redirect.origin !== base.origin || !ADMIN_PATH_PATTERN.test(redirect.pathname)) {
      return DEFAULT_ADMIN_ROUTE
    }
    if (redirect.pathname === '/admin/login') return DEFAULT_ADMIN_ROUTE
    return `${redirect.pathname}${redirect.search}${redirect.hash}`
  } catch {
    return DEFAULT_ADMIN_ROUTE
  }
}

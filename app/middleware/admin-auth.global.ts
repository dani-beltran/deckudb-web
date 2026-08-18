import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { getAdminSession } from '../services/admin/api'

const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path)

const isAdminRoute = (path: string) => path === '/admin' || path.startsWith('/admin/')

export default defineNuxtRouteMiddleware(async (to) => {
  const normalizedPath = normalizePath(to.path)
  if (!isAdminRoute(normalizedPath)) return

  let authenticated = false
  try {
    const session = await getAdminSession()
    authenticated = session.authenticated
  } catch {
    // Authentication checks fail closed.
  }

  if (normalizedPath === '/admin/login') {
    return authenticated ? navigateTo('/admin') : undefined
  }

  if (authenticated) return

  return navigateTo({
    path: '/admin/login',
    query: { redirect: to.fullPath },
  })
})

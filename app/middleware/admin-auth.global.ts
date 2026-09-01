import { defineNuxtRouteMiddleware, navigateTo, useNuxtApp } from '#imports'
import { useAdminSession } from '../composables/useAdminSession'

const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path)

const isAdminRoute = (path: string) => path === '/admin' || path.startsWith('/admin/')

export default defineNuxtRouteMiddleware(async (to) => {
  const normalizedPath = normalizePath(to.path)
  if (!isAdminRoute(normalizedPath)) return
  const { $adminApi } = useNuxtApp()
  const adminSession = useAdminSession()

  let authenticated = false
  try {
    const session = await $adminApi.getAdminSession()
    adminSession.value = session
    authenticated = session.authenticated
  } catch {
    // Authentication checks fail closed.
    adminSession.value = { authenticated: false }
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

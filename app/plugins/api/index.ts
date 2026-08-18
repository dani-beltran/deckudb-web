import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { AdminApi } from './AdminApi'
import { BackendApi } from './BackendApi'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
    headers: { Accept: 'application/json' },
    retry: 0,
  })

  return {
    provide: {
      api,
      adminApi: new AdminApi(api),
      backendApi: new BackendApi(api),
    },
  }
})

import { defineEventHandler, handleCors } from 'h3'
import { getBackendConfig } from '../config'

/** 
 * Applies API CORS policy to Nitro routes under /api. 
 */
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  const { webHost, dashboardHost } = getBackendConfig()
  const allowedOrigins = [webHost, dashboardHost]

  return handleCors(event, {
    origin: (origin) => allowedOrigins.includes(origin),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowHeaders: ['Content-Type', 'X-API-Key'],
  })
})

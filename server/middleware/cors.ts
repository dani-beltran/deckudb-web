import { defineEventHandler, getRequestURL, handleCors } from 'h3'

/**
 * Applies API CORS policy to Nitro routes under /api.
 */
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  const requestOrigin = getRequestURL(event).origin

  handleCors(event, {
    origin: (origin) => origin === requestOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowHeaders: ['Content-Type'],
  })
})

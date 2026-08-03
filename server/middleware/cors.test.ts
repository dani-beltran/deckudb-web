import { createApp, createRouter, toNodeListener } from 'h3'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import corsMiddleware from './cors'

const allowedOrigin = 'http://localhost:3000'

const createCorsTestApp = () => {
  const app = createApp()
  const router = createRouter()

  app.use(corsMiddleware)
  router.get('/api/health', () => ({ status: 'OK' }))
  app.use(router.handler)

  return toNodeListener(app)
}

describe('Nuxt API CORS', () => {
  it('allows credentialed requests from an approved origin', async () => {
    const response = await request(createCorsTestApp())
      .get('/api/health')
      .set('Origin', allowedOrigin)
      .expect(200)

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin)
    expect(response.headers['access-control-allow-credentials']).toBe('true')
    expect(response.headers.vary).toContain('origin')
  })

  it('does not grant CORS access to an unapproved origin', async () => {
    const response = await request(createCorsTestApp())
      .get('/api/health')
      .set('Origin', 'https://untrusted.example')
      .expect(200)

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('handles an approved origin preflight request', async () => {
    const response = await request(createCorsTestApp())
      .options('/api/health')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-api-key')
      .expect(204)

    expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin)
    expect(response.headers['access-control-allow-credentials']).toBe('true')
    expect(response.headers['access-control-allow-methods']).toBe('GET,POST,DELETE')
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type,X-API-Key')
  })
})

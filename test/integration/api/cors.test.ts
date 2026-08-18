import corsMiddleware from '@server/middleware/cors'
import { createApp, createRouter, toNodeListener } from 'h3'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

const requestHost = 'deckudb.test'
const requestOrigin = `http://${requestHost}`

const createCorsTestApp = () => {
  const app = createApp()
  const router = createRouter()

  app.use(corsMiddleware)
  router.get('/api/health', () => ({ status: 'OK' }))
  app.use(router.handler)

  return toNodeListener(app)
}

describe('Nuxt API CORS', () => {
  it('allows credentialed requests from the request origin', async () => {
    const response = await request(createCorsTestApp())
      .get('/api/health')
      .set('Host', requestHost)
      .set('Origin', requestOrigin)
      .expect(200)

    expect(response.headers['access-control-allow-origin']).toBe(requestOrigin)
    expect(response.headers['access-control-allow-credentials']).toBe('true')
    expect(response.headers.vary).toContain('origin')
    expect(response.body).toEqual({ status: 'OK' })
  })

  it('does not grant CORS access to a different origin', async () => {
    const response = await request(createCorsTestApp())
      .get('/api/health')
      .set('Host', requestHost)
      .set('Origin', `http://${requestHost}:4173`)
      .expect(200)

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
    expect(response.headers['access-control-allow-credentials']).toBe('true')
  })

  it('handles a same-origin preflight request', async () => {
    const response = await request(createCorsTestApp())
      .options('/api/health')
      .set('Host', requestHost)
      .set('Origin', requestOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204)

    expect(response.headers['access-control-allow-origin']).toBe(requestOrigin)
    expect(response.headers['access-control-allow-credentials']).toBe('true')
    expect(response.headers['access-control-allow-methods']).toBe('GET,POST,DELETE')
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type')
  })
})

import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { flushDB } from './test-db'
import { cacheSteamApp, mountNuxtTestApp, type NuxtTestApp, unmountNuxtTestApp } from './test-app'

let testApp: NuxtTestApp

describe('Nuxt Steam API', () => {
  beforeAll(async () => {
    testApp = await mountNuxtTestApp()
  })

  afterEach(async () => {
    await flushDB(testApp.db)
  })

  afterAll(async () => {
    await unmountNuxtTestApp(testApp)
  })

  it('returns search results from the Steam cache', async () => {
    const now = new Date()
    await testApp.db.collection('steam_search_cache').insertOne({
      term: 'deck',
      limit: 5,
      data: { items: [{ id: 1, name: 'Steam Deck game', type: 'game' }], total: 1 },
      created_at: now,
      expires_at: new Date(now.getTime() + 60_000),
    })

    const response = await request(testApp.app)
      .get('/api/steam/games?term=deck&limit=5')
      .expect(200)

    expect(response.body).toEqual({
      items: [{ id: 1, name: 'Steam Deck game', type: 'game' }],
      total: 1,
    })
  })

  it('returns cached Steam game details', async () => {
    await cacheSteamApp(testApp.db, 10, {
      steam_appid: 10,
      name: 'Cached game details',
      type: 'game',
    })

    const response = await request(testApp.app).get('/api/steam/games/10').expect(200)

    expect(response.body).toMatchObject({ steam_appid: 10, name: 'Cached game details' })
  })

  it('maps a cached batch of Steam games to search items', async () => {
    await cacheSteamApp(testApp.db, 1, { steam_appid: 1, name: 'One', type: 'game' })
    await cacheSteamApp(testApp.db, 2, { steam_appid: 2, name: 'Two', type: 'game' })

    const response = await request(testApp.app).get('/api/steam/games/batch?ids=1,2').expect(200)

    expect(response.body.total).toBe(2)
    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, name: 'One', type: 'game' }),
        expect.objectContaining({ id: 2, name: 'Two', type: 'game' }),
      ])
    )
  })

  it('paginates cached most-played Steam Deck games', async () => {
    const now = new Date()
    await testApp.db.collection('steam_deck_most_played_cache').insertOne({
      game_ids: [1, 2, 3],
      created_at: now,
      expires_at: new Date(now.getTime() + 60_000),
    })
    await cacheSteamApp(testApp.db, 1, { steam_appid: 1, name: 'One', type: 'game' })
    await cacheSteamApp(testApp.db, 2, { steam_appid: 2, name: 'Two', type: 'game' })
    await cacheSteamApp(testApp.db, 3, { steam_appid: 3, name: 'Three', type: 'game' })

    const response = await request(testApp.app)
      .get('/api/steam/most-played-steam-deck-games?page=2&page_size=1')
      .expect(200)

    expect(response.body).toMatchObject({ total: 3 })
    expect(response.body.items).toEqual([
      expect.objectContaining({ id: 2, name: 'Two', type: 'game' }),
    ])
  })

  it('validates Steam search and batch query parameters', async () => {
    await request(testApp.app).get('/api/steam/games').expect(400)
    const response = await request(testApp.app).get('/api/steam/games/batch?ids=1,nope').expect(400)

    expect(response.body.data.error).toBe('Invalid request query parameters')
  })
})

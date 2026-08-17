import * as steamService from '@server/services/steam/steam'
import type { SteamApp, SteamSearch } from '@server/services/steam/steam.types'
import { bootstrapDependencies, type ServerDependencies } from '@server/utils/bootstrap'
import type { NodeListener } from 'h3'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNuxtTestServer } from '../test-server'

describe('Steam API', () => {
  let testServer: NodeListener
  let dependencies: ServerDependencies

  beforeAll(async () => {
    dependencies = await bootstrapDependencies({
      dbConnectionName: 'test-steam-api',
      mongodbDatabase: 'deckudb-api-steam',
    })
    testServer = createNuxtTestServer(dependencies)
  })

  beforeEach(() => {
    vi.mocked(steamService.mapGamesToSearchItems).mockImplementation(
      (games) =>
        games.map((game) => ({
          id: game.steam_appid,
          name: game.name,
          type: game.type,
        })) as SteamSearch['items']
    )
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await dependencies.databaseClient.flushDB()
  })

  afterAll(async () => {
    await dependencies.databaseClient.disconnect()
  })

  describe('GET /api/steam/games', () => {
    it('returns search results from cache', async () => {
      const cachedSearch: SteamSearch = {
        items: [{ id: 10, name: 'Cached game', type: 'game' } as SteamSearch['items'][0]],
        total: 1,
      }
      const getSearchResults = vi
        .spyOn(dependencies.repositories.steamCache, 'getSearchResults')
        .mockResolvedValueOnce(cachedSearch)

      const response = await request(testServer)
        .get('/api/steam/games?term=helldivers&limit=5')
        .expect(200)

      expect(response.body).toEqual(cachedSearch)
      expect(getSearchResults).toHaveBeenCalledWith('helldivers', 5)
    })

    it('uses default search limit 10', async () => {
      const getSearchResults = vi
        .spyOn(dependencies.repositories.steamCache, 'getSearchResults')
        .mockResolvedValueOnce({ items: [], total: 0 })

      await request(testServer).get('/api/steam/games?term=deck').expect(200)

      expect(getSearchResults).toHaveBeenCalledWith('deck', 10)
    })

    it.each(['/api/steam/games?limit=5', '/api/steam/games?term=deck&limit=101'])(
      'validates search query %s',
      async (url) => {
        const response = await request(testServer).get(url).expect(400)

        expect(response.body.data.error).toBe('Invalid request query parameters')
      }
    )
  })

  describe('GET /api/steam/games/:id', () => {
    it('returns game details from cache', async () => {
      const cachedDetails = { steam_appid: 42, name: 'Cached details', type: 'game' } as SteamApp
      const getGameDetails = vi
        .spyOn(dependencies.repositories.steamCache, 'getGameDetails')
        .mockResolvedValueOnce(cachedDetails)

      const response = await request(testServer).get('/api/steam/games/42').expect(200)

      expect(response.body).toEqual(cachedDetails)
      expect(getGameDetails).toHaveBeenCalledWith(42)
    })

    it('returns 404 when Steam details are unavailable', async () => {
      vi.spyOn(dependencies.repositories.steamCache, 'getGameDetails').mockRejectedValueOnce(
        new Error('Steam error')
      )

      const response = await request(testServer).get('/api/steam/games/999').expect(404)

      expect(response.body.data.error).toBe('Game not found on Steam')
    })

    it.each(['not-a-number', '-1', '0', '1.5'])('validates Steam game ID %s', async (id) => {
      const response = await request(testServer).get(`/api/steam/games/${id}`).expect(400)

      expect(response.body.data.error).toBe('Invalid request parameters')
    })
  })

  describe('GET /api/steam/games/batch', () => {
    it('returns mapped batch game details', async () => {
      const games = [
        { steam_appid: 1, name: 'One', type: 'game' } as SteamApp,
        { steam_appid: 2, name: 'Two', type: 'game' } as SteamApp,
      ]
      vi.spyOn(dependencies.repositories.steamCache, 'getGamesDetails').mockResolvedValueOnce(games)

      const response = await request(testServer).get('/api/steam/games/batch?ids=1,2').expect(200)

      expect(response.body).toEqual({
        items: [
          { id: 1, name: 'One', type: 'game' },
          { id: 2, name: 'Two', type: 'game' },
        ],
        total: 2,
      })
      expect(dependencies.repositories.steamCache.getGamesDetails).toHaveBeenCalledWith([1, 2])
    })

    it.each([
      '/api/steam/games/batch',
      '/api/steam/games/batch?ids=',
      '/api/steam/games/batch?ids=1,nope',
      '/api/steam/games/batch?ids=0,2',
    ])('validates batch query %s', async (url) => {
      const response = await request(testServer).get(url).expect(400)

      expect(response.body.data.error).toBe('Invalid request query parameters')
    })
  })

  describe('GET /api/steam/most-played-steam-deck-games', () => {
    it('returns mapped most-played Steam Deck games', async () => {
      const games = [
        { steam_appid: 7, name: 'Seven', type: 'game' } as SteamApp,
        { steam_appid: 8, name: 'Eight', type: 'game' } as SteamApp,
      ]
      vi.spyOn(
        dependencies.repositories.steamCache,
        'getMostPlayedSteamDeckGameIds'
      ).mockResolvedValueOnce([7, 8])
      vi.spyOn(dependencies.repositories.steamCache, 'getGamesDetails').mockResolvedValueOnce(games)

      const response = await request(testServer)
        .get('/api/steam/most-played-steam-deck-games')
        .expect(200)

      expect(response.body).toEqual({
        items: [
          { id: 7, name: 'Seven', type: 'game' },
          { id: 8, name: 'Eight', type: 'game' },
        ],
        total: 2,
      })
    })

    it('paginates most-played IDs before fetching details', async () => {
      vi.spyOn(
        dependencies.repositories.steamCache,
        'getMostPlayedSteamDeckGameIds'
      ).mockResolvedValueOnce([1, 2, 3, 4])
      const getGamesDetails = vi
        .spyOn(dependencies.repositories.steamCache, 'getGamesDetails')
        .mockResolvedValueOnce([{ steam_appid: 3, name: 'Three', type: 'game' } as SteamApp])

      const response = await request(testServer)
        .get('/api/steam/most-played-steam-deck-games?page=2&page_size=2')
        .expect(200)

      expect(response.body.total).toBe(4)
      expect(getGamesDetails).toHaveBeenCalledWith([3, 4])
    })

    it('returns an empty most-played result when the cache service has no IDs', async () => {
      vi.spyOn(
        dependencies.repositories.steamCache,
        'getMostPlayedSteamDeckGameIds'
      ).mockResolvedValueOnce(null as unknown as number[])
      const getGamesDetails = vi
        .spyOn(dependencies.repositories.steamCache, 'getGamesDetails')
        .mockResolvedValueOnce([])

      const response = await request(testServer)
        .get('/api/steam/most-played-steam-deck-games')
        .expect(200)

      expect(response.body).toEqual({ items: [], total: 0 })
      expect(getGamesDetails).toHaveBeenCalledWith([])
    })

    it.each(['page=0', 'page_size=0', 'page_size=101'])(
      'validates most-played pagination %s',
      async (query) => {
        const response = await request(testServer)
          .get(`/api/steam/most-played-steam-deck-games?${query}`)
          .expect(400)

        expect(response.body.data.error).toBe('Invalid request query parameters')
      }
    )
  })
})

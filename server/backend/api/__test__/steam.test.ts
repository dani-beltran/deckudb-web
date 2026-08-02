import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { mountTestApp, type TestApp, unmountTestApp } from '../../lib/test-setup/test-app'
import { flushDB } from '../../lib/test-setup/test-db'
import * as steamService from '../../services/steam/steam.js'
import type { SteamApp, SteamSearch } from '../../services/steam/steam.types'
import type { AppDependencies } from '../../types/dependencies'

vi.mock('../../services/steam/steam', () => ({
  searchSteamGames: vi.fn(),
  getSteamGameDetails: vi.fn(),
  getMostPlayedSteamDeckGameIds: vi.fn(),
  mapGamesToSearchItems: vi.fn(),
}))

let dependencies: AppDependencies
let app: TestApp

describe('steam router', () => {
  const steamCache = () => dependencies.repositories.steamCache

  beforeAll(async () => {
    app = await mountTestApp()
    dependencies = app.locals.dependencies
  })

  afterEach(async () => {
    vi.clearAllMocks()
    await flushDB(app.locals.db)
  })

  afterAll(async () => {
    if (app) await unmountTestApp(app)
  })

  it('returns search results from cache for GET /steam/games', async () => {
    const cachedSearch: SteamSearch = {
      items: [
        {
          id: 10,
          name: 'Cached game',
          type: 'game',
        } as SteamSearch['items'][0],
      ],
      total: 1,
    }
    vi.spyOn(steamCache(), 'getSearchResults').mockResolvedValueOnce(cachedSearch)

    const response = await request(app)
      .get('/steam/games?term=helldivers&limit=5')
      .expect(200)

    expect(response.body).toEqual(cachedSearch)
    expect(steamCache().getSearchResults).toHaveBeenCalledWith('helldivers', 5)
    expect(steamService.searchSteamGames).not.toHaveBeenCalled()
  })

  it('returns 400 for GET /steam/games when term is missing', async () => {
    const response = await request(app).get('/steam/games?limit=5').expect(400)

    expect(response.body.error).toBe('Invalid query parameters')
  })

  it('returns details from cache for GET /steam/games/:id', async () => {
    const cachedDetails = {
      steam_appid: 42,
      name: 'Cached details',
    } as SteamApp
    vi.spyOn(steamCache(), 'getGameDetails').mockResolvedValueOnce(cachedDetails)

    const response = await request(app).get('/steam/games/42').expect(200)

    expect(response.body).toEqual(cachedDetails)
    expect(steamCache().getGameDetails).toHaveBeenCalledWith(42)
    expect(steamService.getSteamGameDetails).not.toHaveBeenCalled()
  })

  it('returns 404 for GET /steam/games/:id when steam details are unavailable', async () => {
    vi.spyOn(steamCache(), 'getGameDetails').mockRejectedValueOnce(new Error('Not found'))
    vi.mocked(steamService.getSteamGameDetails).mockRejectedValueOnce(new Error('steam error'))

    const response = await request(app).get('/steam/games/999').expect(404)

    expect(response.body).toEqual({ error: 'Game not found on Steam' })
  })

  it('returns 400 for GET /steam/games/:id with invalid ID', async () => {
    const response = await request(app).get('/steam/games/not-a-number').expect(400)

    expect(response.body.error).toBe('Invalid request parameters')
  })

  it('returns mapped batch game details for GET /steam/games/batch', async () => {
    const gameDetails = [
      { steam_appid: 1, name: 'One', type: 'game' } as SteamApp,
      { steam_appid: 2, name: 'Two', type: 'game' } as SteamApp,
    ]
    const mappedItems: SteamSearch['items'] = [
      { id: 1, name: 'One', type: 'game' } as SteamSearch['items'][0],
      { id: 2, name: 'Two', type: 'game' } as SteamSearch['items'][0],
    ]

    vi.spyOn(steamCache(), 'getGamesDetails').mockResolvedValueOnce(gameDetails)
    vi.mocked(steamService.mapGamesToSearchItems).mockReturnValueOnce(mappedItems)

    const response = await request(app).get('/steam/games/batch?ids=1,2').expect(200)

    expect(response.body).toEqual({
      items: mappedItems,
      total: 2,
    })
  })

  it('returns mapped most-played steam deck games', async () => {
    const gameDetails = [
      { steam_appid: 7, name: 'Seven', type: 'game' } as SteamApp,
      { steam_appid: 8, name: 'Eight', type: 'game' } as SteamApp,
    ]
    const mappedItems: SteamSearch['items'] = [
      { id: 7, name: 'Seven', type: 'game' } as SteamSearch['items'][0],
      { id: 8, name: 'Eight', type: 'game' } as SteamSearch['items'][0],
    ]

    vi.spyOn(steamCache(), 'getMostPlayedSteamDeckGameIds').mockResolvedValueOnce([7, 8])
    vi.spyOn(steamCache(), 'getGamesDetails').mockResolvedValueOnce(gameDetails)
    vi.mocked(steamService.mapGamesToSearchItems).mockReturnValueOnce(mappedItems)

    const response = await request(app)
      .get('/steam/most-played-steam-deck-games')
      .expect(200)

    expect(response.body).toEqual({
      items: mappedItems,
      total: 2,
    })
  })
})

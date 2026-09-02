import { createPage, setup, url as testUrl } from '@nuxt/test-utils/e2e'
import type { GameResponse } from '@server/api/games/[id].get'
import type { SteamGamesResponse } from '@server/api/steam/games/index.get'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEY } from '~/stores/recentGamesStore'
import {
  createSteamSearchItem,
  emptyMostPlayedGamesResponse,
  emptySteamGamesResponse,
  portal2GameResponse,
  portal2SearchItem,
  serviceUnavailableResponse,
} from './fixtures'
import { getDebugConfig } from './helpers'

const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'
const SEARCH_ENDPOINT = '/api/steam/games'

const portalSearchItem = createSteamSearchItem({
  id: 400,
  name: 'Portal',
  platforms: { windows: true, mac: true, linux: true },
})

const portalReloadedSearchItem = createSteamSearchItem({
  id: 1255980,
  name: 'Portal Reloaded',
  platforms: { windows: true, mac: false, linux: true },
})

const portalSearchResults = [
  portal2SearchItem,
  portalSearchItem,
  createSteamSearchItem({ id: 601360, name: 'Portal Knights' }),
  createSteamSearchItem({
    id: 317400,
    name: 'Portal Stories: Mel',
    platforms: { windows: true, mac: false, linux: true },
  }),
  portalReloadedSearchItem,
  createSteamSearchItem({ id: 280740, name: 'Aperture Tag' }),
] satisfies SteamGamesResponse['items']

const portalSuggestionsResponse = {
  items: [portal2SearchItem, portalSearchItem],
  total: 2,
} satisfies SteamGamesResponse

const recentPortal2Response = {
  items: [portal2SearchItem],
  total: 1,
} satisfies SteamGamesResponse

const portalSearchResponse = {
  items: portalSearchResults,
  total: portalSearchResults.length,
} satisfies SteamGamesResponse

const portalReloadedGameResponse = {
  status: 'ready',
  game: {
    game_id: portalReloadedSearchItem.id,
    game_performance_summary: null,
    steam_app: {
      steam_appid: portalReloadedSearchItem.id,
      name: portalReloadedSearchItem.name,
      type: 'game',
    },
    reports: [],
  },
} satisfies GameResponse

function isSearchRequest(requestUrl: string) {
  return new URL(requestUrl).pathname === SEARCH_ENDPOINT
}

describe('game search', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
  })

  it('submits a search from the home page and displays matching games', async () => {
    const page = await createPage()

    await page.route('**/api/steam/games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portalSuggestionsResponse),
      })
    })
    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })

    await page.goto(testUrl('/'))
    await page.getByLabel('Enter search term').fill('Portal')
    await page.getByLabel('Enter search term').press('Enter')
    await page.waitForURL(
      (url) => url.pathname === '/search' && url.searchParams.get('q') === 'Portal'
    )
    await page.getByRole('heading', { name: 'Found 2 Steam games:' }).waitFor()

    expect(await page.getByRole('heading', { name: 'Found 2 Steam games:' }).isVisible()).toBe(true)
    expect(await page.getByText('Portal 2', { exact: true }).isVisible()).toBe(true)
    expect(await page.getByText('Portal', { exact: true }).isVisible()).toBe(true)
  })

  it('supports keyboard selection from search suggestions', async () => {
    const page = await createPage()
    const gamePath = `/game/${portal2GameResponse.game.game_id}`

    await page.route('**/api/steam/games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portalSuggestionsResponse),
      })
    })
    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })
    await page.route(`**/api/games/${portal2GameResponse.game.game_id}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portal2GameResponse),
      })
    })

    await page.goto(testUrl('/'))
    const searchInput = page.getByLabel('Enter search term')
    await searchInput.fill(portal2SearchItem.name.padEnd(2, 'x'))
    const firstSuggestion = page.getByRole('option', { name: portal2SearchItem.name })
    await firstSuggestion.waitFor()
    await searchInput.press('ArrowDown')

    expect(await firstSuggestion.getAttribute('aria-selected')).toBe('true')

    await searchInput.press('Enter')
    await page.waitForURL((url) => url.pathname === gamePath)
    const gameHeading = page.getByRole('heading', {
      name: portal2GameResponse.game.steam_app.name,
    })
    await gameHeading.waitFor()
    expect(await gameHeading.isVisible()).toBe(true)
  })

  it('persists a selected result and restores it as a recent game after reload', async () => {
    const page = await createPage()
    const gamePath = `/game/${portal2GameResponse.game.game_id}`

    await page.setViewportSize({ width: 1024, height: 768 })
    await page.addInitScript((storageKey) => {
      const initializationKey = 'e2eRecentGamesInitialized'
      if (sessionStorage.getItem(initializationKey)) return

      localStorage.removeItem(storageKey)
      sessionStorage.setItem(initializationKey, 'true')
    }, STORAGE_KEY)
    await page.route('**/api/steam/games?*', (route) => {
      if (!isSearchRequest(route.request().url())) return route.continue()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portalSuggestionsResponse),
      })
    })
    await page.route('**/api/steam/games/batch?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(recentPortal2Response),
      })
    })
    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })
    await page.route(`**/api/games/${portal2GameResponse.game.game_id}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portal2GameResponse),
      })
    })

    await page.goto(testUrl('/search?q=Portal'))
    await page.getByRole('heading', { name: 'Found 2 Steam games:' }).waitFor()
    await page.getByLabel('Select Portal 2 for Steam Deck settings').click()
    await page.waitForURL((url) => url.pathname === gamePath)

    expect(await page.evaluate((storageKey) => localStorage.getItem(storageKey), STORAGE_KEY)).toBe(
      '[620]'
    )

    await page.reload()
    await page.getByRole('heading', { name: portal2SearchItem.name }).waitFor()
    await page.getByRole('link', { name: 'Go to home page' }).click()
    await page.waitForURL((url) => url.pathname === '/')

    const recentGamesRequest = page.waitForRequest(
      (request) => new URL(request.url()).pathname === '/api/steam/games/batch'
    )
    await page.getByLabel('Enter search term').focus()
    const requestUrl = new URL((await recentGamesRequest).url())

    expect(requestUrl.searchParams.get('ids')).toBe(String(portal2SearchItem.id))
    const recentGamesTitle = page.getByText('Recent Games Searched', { exact: true })
    await recentGamesTitle.waitFor()
    expect(await recentGamesTitle.isVisible()).toBe(true)

    const recentGame = page.getByRole('option', { name: portal2SearchItem.name })
    await recentGame.waitFor()
    await recentGame.click()
    await page.waitForURL((url) => url.pathname === gamePath)
  })

  it('reveals additional results and opens a selected game', async () => {
    const page = await createPage()
    await page.setViewportSize({ width: 700, height: 900 })

    await page.route('**/api/steam/games?*', (route) => {
      if (!isSearchRequest(route.request().url())) return route.continue()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portalSearchResponse),
      })
    })
    await page.route(`**/api/games/${portalReloadedGameResponse.game.game_id}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portalReloadedGameResponse),
      })
    })

    await page.goto(testUrl('/search?q=Portal'))
    await page.getByRole('heading', { name: 'Found 6 Steam games:' }).waitFor()

    expect(await page.locator('.game-card').count()).toBe(4)
    await page.getByRole('button', { name: 'Show more results (2)' }).click()
    expect(await page.locator('.game-card').count()).toBe(6)

    await page.getByLabel('Select Portal Reloaded for Steam Deck settings').click()
    await page.waitForURL((url) => url.pathname === '/game/1255980')
  })

  it('shows useful empty and failure states', async () => {
    const page = await createPage()
    let shouldFail = false

    await page.route('**/api/steam/games?*', (route) => {
      if (shouldFail) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify(serviceUnavailableResponse),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptySteamGamesResponse),
      })
    })

    await page.goto(testUrl('/search?q=NoSuchGame'))
    await page.getByText('No games found with that name', { exact: true }).waitFor()
    expect(
      await page.getByText('Try a different search term or check the spelling.').isVisible()
    ).toBe(true)

    shouldFail = true
    const input = page.getByLabel('Enter search term')
    await input.fill('Unavailable')
    await page.getByLabel('Run the search').click()
    await page.getByText('Error searching for games', { exact: true }).waitFor()
    expect(
      await page.getByText('An error occurred while searching. Please try again later.').isVisible()
    ).toBe(true)
  })
})

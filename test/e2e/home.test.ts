import { createPage, setup, url as testUrl } from '@nuxt/test-utils/e2e'
import type { MostPlayedSteamDeckGamesResponse } from '@server/api/steam/most-played-steam-deck-games.get'
import { describe, expect, it } from 'vitest'
import {
  createSteamSearchItem,
  emptyMostPlayedGamesResponse,
  portal2GameResponse,
  portal2SearchItem,
} from './fixtures'
import { getDebugConfig } from './helpers'

const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'

const popularGamesResponse = {
  items: [
    portal2SearchItem,
    createSteamSearchItem({ id: 413150, name: 'Stardew Valley' }),
    createSteamSearchItem({ id: 1086940, name: "Baldur's Gate 3" }),
  ],
  total: 3,
} satisfies MostPlayedSteamDeckGamesResponse

describe('home page', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
  })

  it('shows the primary search experience', async () => {
    const page = await createPage('/')

    expect(await page.getByTestId('search-title').isVisible()).toBe(true)
    expect(await page.getByLabel('Enter search term').isVisible()).toBe(true)
    expect(await page.getByLabel('Run the search').isVisible()).toBe(true)
    expect(await page.title()).toBe('DeckuDB - Optimize Every Game on the Steam Deck')
  })

  it('loads popular games and opens a card with the keyboard', async () => {
    const page = await createPage()
    const gamePath = `/game/${portal2GameResponse.game.game_id}`

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(popularGamesResponse),
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
    const popularGameCard = page.getByRole('button', {
      name: `View ${portal2SearchItem.name} settings`,
    })
    await popularGameCard.waitFor()
    await popularGameCard.press('Enter')
    await page.waitForURL((url) => url.pathname === gamePath)
    await page.getByRole('heading', { name: portal2GameResponse.game.steam_app.name }).waitFor()

    expect(
      await page.getByRole('heading', { name: portal2GameResponse.game.steam_app.name }).isVisible()
    ).toBe(true)
  })

  it('persists the selected color theme across reloads', async () => {
    const page = await createPage()

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })
    await page.goto(testUrl('/'))
    await page.evaluate(() => localStorage.setItem('darkMode', 'disabled'))
    await page.reload()

    const darkModeButton = page.getByRole('button', { name: 'Switch to dark mode' })
    await darkModeButton.click()
    expect(await page.locator('html').getAttribute('class')).toContain('dark-mode')
    expect(await page.evaluate(() => localStorage.getItem('darkMode'))).toBe('enabled')

    await page.reload()
    expect(await page.getByRole('button', { name: 'Switch to light mode' }).isVisible()).toBe(true)
    expect(await page.locator('html').getAttribute('class')).toContain('dark-mode')
  })
})

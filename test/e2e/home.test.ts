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
    createSteamSearchItem({ id: 1145360, name: 'Hades' }),
    createSteamSearchItem({ id: 367520, name: 'Hollow Knight' }),
    createSteamSearchItem({ id: 1245620, name: 'ELDEN RING' }),
  ],
  total: 6,
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

  it('uses the popular games gallery in desktop mode', async () => {
    const page = await createPage()
    await page.setViewportSize({ width: 1280, height: 900 })

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(popularGamesResponse),
      })
    })

    await page.goto(testUrl('/'))
    await page.getByRole('button', { name: `View ${portal2SearchItem.name} settings` }).waitFor()

    const popularGames = page.getByRole('region', { name: 'Popular Games' }).last()
    const carouselTrack = popularGames.locator('.carousel-track')
    expect(await popularGames.locator('.carousel-section').isVisible()).toBe(true)
    expect(await popularGames.locator('.infinite-scroll-collection').count()).toBe(0)
    expect(await carouselTrack.getAttribute('style')).toContain('translateX(0%)')

    await popularGames.getByRole('button', { name: 'Next games' }).click()

    expect(await carouselTrack.getAttribute('style')).toContain('translateX(-100%)')
    expect(await page.evaluate(() => localStorage.getItem('popularGames_currentIndex'))).toBe('1')
    expect(await popularGames.getByRole('button', { name: 'Previous games' }).isEnabled()).toBe(
      true
    )
  })

  it('loads more popular games with infinite scroll in mobile mode', async () => {
    const page = await createPage()
    await page.setViewportSize({ width: 390, height: 700 })

    const mobilePages = new Map<number, MostPlayedSteamDeckGamesResponse['items']>([
      [
        1,
        [
          createSteamSearchItem({ id: 10, name: 'Mobile Game 1' }),
          createSteamSearchItem({ id: 20, name: 'Mobile Game 2' }),
        ],
      ],
      [
        2,
        [
          createSteamSearchItem({ id: 30, name: 'Mobile Game 3' }),
          createSteamSearchItem({ id: 40, name: 'Mobile Game 4' }),
        ],
      ],
      [3, [createSteamSearchItem({ id: 50, name: 'Mobile Game 5' })]],
    ])
    const requestedPages: number[] = []

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      const pageNumber = Number(new URL(route.request().url()).searchParams.get('page'))
      requestedPages.push(pageNumber)
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: mobilePages.get(pageNumber) ?? [], total: 35 }),
      })
    })

    await page.goto(testUrl('/'))
    await page.getByRole('button', { name: 'View Mobile Game 1 settings' }).waitFor()

    const popularGames = page.getByRole('region', { name: 'Popular Games' }).last()
    expect(await popularGames.locator('.infinite-scroll-collection').isVisible()).toBe(true)
    expect(await popularGames.locator('.carousel-section').count()).toBe(0)

    await popularGames
      .getByRole('button', { name: 'Load More', exact: true })
      .evaluate((button) => (button as HTMLElement).click())
    const fourthGame = page.getByRole('button', { name: 'View Mobile Game 4 settings' })
    await fourthGame.waitFor()
    expect(requestedPages).toEqual([1, 2])

    await fourthGame.scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: 'View Mobile Game 5 settings' }).waitFor()

    expect(requestedPages).toEqual([1, 2, 3])
    expect(await popularGames.locator('.list-item').count()).toBe(5)
  })

  it('activates and deactivates dark mode and persists the selection', async () => {
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
    expect(await page.getByRole('button', { name: 'Switch to light mode' }).isVisible()).toBe(true)

    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    expect((await page.locator('html').getAttribute('class')) ?? '').not.toContain('dark-mode')
    expect(await page.evaluate(() => localStorage.getItem('darkMode'))).toBe('disabled')
    expect(await page.getByRole('button', { name: 'Switch to dark mode' }).isVisible()).toBe(true)

    await page.reload()
    expect((await page.locator('html').getAttribute('class')) ?? '').not.toContain('dark-mode')
    expect(await page.getByRole('button', { name: 'Switch to dark mode' }).isVisible()).toBe(true)
  })
})

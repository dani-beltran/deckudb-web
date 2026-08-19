import { createPage, setup, url as testUrl } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { emptyMostPlayedGamesResponse } from './fixtures'
import { getDebugConfig } from './helpers'

const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'

describe('application navigation', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
  })

  it('renders the not-found page and returns home', async () => {
    const page = await createPage()

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })
    await page.goto(testUrl('/this-route-does-not-exist'))

    expect(await page.getByRole('heading', { name: '404' }).isVisible()).toBe(true)
    expect(await page.getByRole('heading', { name: 'Page Not Found' }).isVisible()).toBe(true)

    await page.getByRole('button', { name: 'Go Home' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    expect(await page.getByTestId('search-title').isVisible()).toBe(true)
  })

  it('exposes a keyboard skip link to the main content', async () => {
    const page = await createPage()

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })
    await page.goto(testUrl('/'))
    await page.keyboard.press('Tab')

    const skipLink = page.getByRole('link', { name: 'Skip to main content' })
    expect(await skipLink.evaluate((element) => element === document.activeElement)).toBe(true)
    await skipLink.press('Enter')
    expect(new URL(page.url()).hash).toBe('#main-content')
  })
})

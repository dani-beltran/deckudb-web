import { createPage, setup, url as testUrl } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { getDebugConfig } from './helpers'
import type { GameResponse } from '@server/api/games/[id].get'

const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'

describe('game page', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
  })

  it('updates the document title after the game finishes loading', async () => {
    const page = await createPage()

    await page.route('**/api/games/620', (route) => {
      const gameResponse: GameResponse = {
        status: 'ready',
        game: {
          game_id: 620,
          game_performance_summary: null,
          steamdeck_rating: null,
          steamdeck_verified: null,
          updated_at: new Date(),
          created_at: new Date(),
          steam_app: {
            steam_appid: 620,
            name: 'Portal 2',
            type: 'game',
            short_description: 'A test game.',
          },
          reports: [],
        },
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(gameResponse),
      })
    })
    
    await page.goto(testUrl('/game/620'))
    await page.getByRole('heading', { name: 'Portal 2' }).waitFor()

    expect(await page.title()).toBe('Portal 2 - Steam Deck Reports')
  })
})

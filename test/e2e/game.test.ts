import { createPage, setup, url as testUrl } from '@nuxt/test-utils/e2e'
import type {
  SummaryVoteRequest,
  SummaryVoteResponse,
} from '@server/api/games/[id]/summary-vote.post'
import type { GameResponse } from '@server/api/games/[id].get'
import { SCRAPE_SOURCES } from '@server/models/game-sources.schema'
import { VOTE_TYPE } from '@server/models/game-summary-votes.schema'
import { STEAMDECK_HARDWARE, STEAMDECK_RATING } from '@server/models/games.schema'
import { describe, expect, it } from 'vitest'
import { getDebugConfig } from './helpers'

const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'

const readyPortal2GameResponse = {
  status: 'ready',
  game: {
    game_id: 620,
    game_performance_summary: 'Runs smoothly at a stable frame rate.',
    steamdeck_rating: STEAMDECK_RATING.PLATINUM,
    steamdeck_verified: true,
    updated_at: new Date('2026-08-18T10:00:00.000Z'),
    created_at: new Date('2026-08-01T10:00:00.000Z'),
    steam_app: {
      steam_appid: 620,
      name: 'Portal 2',
      type: 'game',
      short_description: 'A test chamber puzzle game.',
    },
    reports: [
      {
        game_id: 620,
        title: 'OLED battery setup',
        notes: 'A quiet and efficient configuration.',
        source: SCRAPE_SOURCES.SHAREDECK,
        url: 'https://example.test/oled-report',
        reporter: {
          username: 'Recent OLED Player',
          user_profile_url: 'https://example.test/users/oled',
        },
        steamdeck_hardware: STEAMDECK_HARDWARE.OLED,
        steamdeck_settings: { frame_rate_cap: 40, tdp_limit: 8 },
        posted_at: new Date('2026-08-17T10:00:00.000Z'),
        created_at: new Date('2026-08-17T10:00:00.000Z'),
        updated_at: new Date('2026-08-17T10:00:00.000Z'),
      },
      {
        game_id: 620,
        title: 'LCD performance setup',
        notes: 'A high frame-rate configuration.',
        source: SCRAPE_SOURCES.PROTONDB,
        url: 'https://example.test/lcd-report',
        reporter: {
          username: 'Older LCD Player',
          user_profile_url: 'https://example.test/users/lcd',
        },
        steamdeck_hardware: STEAMDECK_HARDWARE.LCD,
        steamdeck_settings: { frame_rate_cap: 60, tdp_limit: 12 },
        posted_at: new Date('2026-08-10T10:00:00.000Z'),
        created_at: new Date('2026-08-10T10:00:00.000Z'),
        updated_at: new Date('2026-08-10T10:00:00.000Z'),
      },
    ],
  },
} satisfies GameResponse

const summaryVoteRequest = {
  vote_type: VOTE_TYPE.UP,
} satisfies SummaryVoteRequest

const summaryVoteResponse = {
  message: 'Vote recorded',
} satisfies SummaryVoteResponse

const queuedGameResponse = {
  status: 'queued',
  game: {
    game_id: 999,
    steam_app: { steam_appid: 999, name: 'Queued Game', type: 'game' },
    reports: [],
  },
} satisfies GameResponse

const nonGameResponse = {
  status: 'invalid',
  game: {
    game_id: 123,
    steam_app: {
      steam_appid: 123,
      name: 'Portal 2 Soundtrack',
      type: 'music',
      fullgame: { appid: '620', name: 'Portal 2' },
    },
    reports: [],
  },
} satisfies GameResponse

const gameNotFoundId = 404
const gameNotFoundResponse = {
  statusCode: 404,
  statusMessage: 'Game not found',
}

async function mockReadyGame(page: Awaited<ReturnType<typeof createPage>>) {
  await page.route('**/api/games/620', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(readyPortal2GameResponse),
    })
  })
}

describe('game page', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
  })

  it('renders game details, compatibility badges, and newest reports first', async () => {
    const page = await createPage()
    await mockReadyGame(page)

    await page.goto(testUrl('/game/620'))
    await page.getByRole('heading', { name: 'Portal 2' }).waitFor()

    expect(await page.title()).toBe('Portal 2 - Steam Deck Reports')
    expect(await page.getByText('A test chamber puzzle game.').isVisible()).toBe(true)
    expect(await page.getByText('PLATINUM', { exact: true }).isVisible()).toBe(true)
    expect(await page.getByText('Verified', { exact: true }).isVisible()).toBe(true)
    expect(await page.locator('.report-card').count()).toBe(2)
    expect(
      await page.locator('.report-card').first().getByText('Recent OLED Player').isVisible()
    ).toBe(true)
  })

  it('filters community reports by hardware, performance, and power usage', async () => {
    const page = await createPage()
    await mockReadyGame(page)

    await page.goto(testUrl('/game/620'))
    await page.getByRole('heading', { name: 'Community Game Reports' }).waitFor()

    await page.getByRole('button', { name: 'LCD', exact: true }).click()
    expect(await page.locator('.report-card').count()).toBe(1)
    expect(await page.getByText('Older LCD Player').isVisible()).toBe(true)

    await page.getByRole('button', { name: 'OLED', exact: true }).click()
    expect(await page.locator('.report-card').count()).toBe(1)
    expect(await page.getByText('Recent OLED Player').isVisible()).toBe(true)

    await page.getByRole('button', { name: '60 FPS', exact: true }).click()
    expect(await page.locator('.report-card').count()).toBe(1)
    expect(await page.getByText('Older LCD Player').isVisible()).toBe(true)

    await page.getByRole('button', { name: 'Low TDP', exact: true }).click()
    expect(await page.locator('.report-card').count()).toBe(1)
    expect(await page.getByText('Recent OLED Player').isVisible()).toBe(true)

    await page.getByRole('button', { name: 'All', exact: true }).click()
    expect(await page.locator('.report-card').count()).toBe(2)
  })

  it('shows the AI summary and submits helpful feedback', async () => {
    const page = await createPage()
    await mockReadyGame(page)
    const voteEndpoint = '/api/games/620/summary-vote'

    let submittedVote: unknown
    await page.route(`**${voteEndpoint}`, async (route) => {
      submittedVote = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(summaryVoteResponse),
      })
    })

    await page.goto(testUrl('/game/620'))
    await page.getByRole('button', { name: 'Ask AI' }).click()
    const typewriterText = page.locator('.typewriter-text')
    expect(await typewriterText.textContent()).toBe('')
    await page.waitForFunction((fullText) => {
      const displayedText = document.querySelector('.typewriter-text')?.textContent ?? ''
      return displayedText.length > 0 && displayedText.length < fullText.length
    }, readyPortal2GameResponse.game.game_performance_summary)
    expect(await page.locator('.decku-logo').getAttribute('class')).toContain('logo-typing')

    await page.getByRole('button', { name: 'Thumbs up' }).waitFor()
    expect(await typewriterText.textContent()).toContain(
      readyPortal2GameResponse.game.game_performance_summary
    )
    expect(await typewriterText.textContent()).toContain(
      'This is a brief summary of community feedback generated by AI and may contain errors.'
    )
    expect(await page.locator('.decku-logo').getAttribute('class')).not.toContain('logo-typing')
    const voteResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === voteEndpoint
    )
    await page.getByRole('button', { name: 'Thumbs up' }).click()

    expect((await voteResponse).status()).toBe(200)
    expect(submittedVote).toEqual(summaryVoteRequest)
    expect(await page.getByRole('alert').getByText('Thanks for your feedback!').isVisible()).toBe(
      true
    )
  })

  it('shows the processing state for a queued game', async () => {
    const page = await createPage()

    await page.route('**/api/games/999', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(queuedGameResponse),
      })
    })

    await page.goto(testUrl('/game/999'))
    expect(await page.getByRole('heading', { name: 'Queued Game' }).isVisible()).toBe(true)
    expect(await page.getByText('Not Ready', { exact: true }).isVisible()).toBe(true)
    expect(await page.getByRole('heading', { name: /Game Being Processed/ }).isVisible()).toBe(true)

    const retryButton = page.getByRole('button', { name: /Try again in 60 seconds/ })
    expect(await retryButton.isDisabled()).toBe(true)
  })

  it('explains non-game Steam items and links to their parent game', async () => {
    const page = await createPage()

    await page.route('**/api/games/123', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(nonGameResponse),
      })
    })

    await page.goto(testUrl('/game/123'))
    expect(
      await page
        .getByText('This is not a video game! You may be looking for Portal 2 instead.')
        .isVisible()
    ).toBe(true)
    expect(
      await page.getByRole('link', { name: 'Portal 2', exact: true }).getAttribute('href')
    ).toBe('/game/620')
  })

  it('displays and dismisses API errors', async () => {
    const page = await createPage()

    await page.route('**/api/games/404', (route) => {
      route.fulfill({
        status: gameNotFoundResponse.statusCode,
        contentType: 'application/json',
        body: JSON.stringify(gameNotFoundResponse),
      })
    })

    await page.goto(testUrl(`/game/${gameNotFoundId}`))
    await page.getByText('Game not found', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Dismiss' }).click()

    expect(await page.getByText('Game not found', { exact: true }).isVisible()).toBe(false)
  })
})

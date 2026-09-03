import { createPage, setup, url as testUrl } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { emptyMostPlayedGamesResponse } from './fixtures'
import { getDebugConfig } from './helpers'

const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'

function uiMessageStream(text: string) {
  return [
    'data: {"type":"start","messageId":"assistant-message"}\n\n',
    'data: {"type":"text-start","id":"text-1"}\n\n',
    `data: ${JSON.stringify({ type: 'text-delta', id: 'text-1', delta: text })}\n\n`,
    'data: {"type":"text-end","id":"text-1"}\n\n',
    'data: {"type":"finish"}\n\n',
    'data: [DONE]\n\n',
  ].join('')
}

const streamHeaders = {
  'Content-Type': 'text/event-stream',
  'x-vercel-ai-ui-message-stream': 'v1',
}

describe('support chat', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
  })

  it('opens from the greeting and sends messages with the keyboard', async () => {
    const page = await createPage()
    const requests: string[] = []

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })
    await page.route('**/api/chat', (route) => {
      const body = route.request().postDataJSON() as {
        message: { parts: Array<{ type: string; text: string }> }
      }
      requests.push(body.message.parts[0]?.text ?? '')
      route.fulfill({
        status: 200,
        headers: streamHeaders,
        body: uiMessageStream('<strong>Portal 2 runs beautifully.</strong>'),
      })
    })

    await page.goto(testUrl('/'))
    expect(
      await page.getByText('Hello there! Ask me about any game.', { exact: true }).isVisible()
    ).toBe(true)

    await page.getByRole('button', { name: 'Open support chat' }).click()
    const dialog = page.getByRole('dialog', { name: 'DeckuBot support chat' })
    const input = page.getByLabel('Message DeckuBot')

    expect(await dialog.isVisible()).toBe(true)
    expect(
      await dialog
        .getByText('Hi! I’m DeckuBot. Ask me about any game or how it runs on Steam Deck.', {
          exact: true,
        })
        .isVisible()
    ).toBe(true)
    expect(await input.evaluate((element) => element === document.activeElement)).toBe(true)

    await input.fill('Line one')
    await input.press('Shift+Enter')
    expect(await input.inputValue()).toBe('Line one\n')
    expect(requests).toEqual([])

    await input.fill('How does Portal 2 run?')
    await input.press('Enter')
    await dialog.getByText('<strong>Portal 2 runs beautifully.</strong>', { exact: true }).waitFor()

    expect(requests).toEqual(['How does Portal 2 run?'])
    expect(await dialog.locator('strong').count()).toBe(0)
    expect(await input.inputValue()).toBe('')
  })

  it('shows an error and retries without duplicating the user message', async () => {
    const page = await createPage()
    let requestCount = 0

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })
    await page.route('**/api/chat', (route) => {
      requestCount += 1
      if (requestCount === 1) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ statusMessage: 'Service unavailable' }),
        })
      }
      return route.fulfill({
        status: 200,
        headers: streamHeaders,
        body: uiMessageStream('Hades is Steam Deck Verified.'),
      })
    })

    await page.goto(testUrl('/'))
    await page.getByRole('button', { name: 'Open support chat' }).click()
    const dialog = page.getByRole('dialog', { name: 'DeckuBot support chat' })
    const input = page.getByLabel('Message DeckuBot')

    await input.fill('What about Hades?')
    await input.press('Enter')
    const error = dialog.getByRole('alert')
    await error.waitFor()

    expect(
      await error.getByText('I couldn’t send that message. Please try again.').isVisible()
    ).toBe(true)
    expect(await dialog.locator('.support-chat-message--user').count()).toBe(1)

    await error.getByRole('button', { name: 'Try again' }).click()
    await dialog.getByText('Hades is Steam Deck Verified.', { exact: true }).waitFor()

    expect(requestCount).toBe(2)
    expect(await dialog.locator('.support-chat-message--user').count()).toBe(1)
    expect(await dialog.getByRole('alert').count()).toBe(0)
  })

  it('fits a mobile viewport, follows dark mode, and restores focus after Escape', async () => {
    const page = await createPage()
    await page.setViewportSize({ width: 390, height: 700 })
    await page.addInitScript(() => localStorage.setItem('darkMode', 'disabled'))

    await page.route('**/api/steam/most-played-steam-deck-games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(emptyMostPlayedGamesResponse),
      })
    })

    await page.goto(testUrl('/'))
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await page.getByRole('button', { name: 'Open support chat' }).click()

    const panel = page.getByRole('dialog', { name: 'DeckuBot support chat' })
    const panelBox = await panel.boundingBox()
    expect(panelBox).not.toBeNull()
    expect(panelBox?.x ?? -1).toBeGreaterThanOrEqual(0)
    expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0)).toBeLessThanOrEqual(390)
    expect(panelBox?.y ?? -1).toBeGreaterThanOrEqual(0)
    expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0)).toBeLessThanOrEqual(700)
    expect(await panel.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      'rgb(30, 41, 59)'
    )

    await page.keyboard.press('Escape')
    const launcher = page.getByRole('button', { name: 'Open support chat' })
    await launcher.waitFor()
    await panel.waitFor({ state: 'detached' })

    expect(await panel.count()).toBe(0)
    expect(await launcher.evaluate((element) => element === document.activeElement)).toBe(true)
  })
})

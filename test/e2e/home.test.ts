import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('HOME page', async () => {
  await setup({})

  it('should include site title', async () => {
    const res = await $fetch<string>('/', { method: 'GET' })
    expect(res).toContain('<title>DeckuDB - Optimize Every Game on the Steam Deck</title>')
  })

  // it("should show search title", async () => {
  //     const page = await createPage('/')
  //         expect(await page.getByTestId('search-title').isVisible()).toBe(true)

  // })
})

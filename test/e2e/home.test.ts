import { createPage, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { getDebugConfig } from './helpers'

const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'

describe('home page', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
  })

  it("should show search title", async () => {
    const page = await createPage('/')
    expect(await page.getByTestId('search-title').isVisible()).toBe(true)
  })
})

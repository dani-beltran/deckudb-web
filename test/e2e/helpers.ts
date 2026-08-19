import type { TestOptions } from '@nuxt/test-utils'

/**
 * Use the debug config within e2e setup function options to run the e2e
 * tests in a browser with a visible UI and slow motion.
 * @example
 * setup({
 * ...getDebugConfig()
 * })
 */
export function getDebugConfig(): Partial<TestOptions> {
  return {
    browser: true,
    browserOptions: {
      type: 'chromium',
      launch: {
        headless: false,
        slowMo: 400,
      },
    },
  }
}

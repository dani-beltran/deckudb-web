import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const env = loadEnv('test', fileURLToPath(new URL('.', import.meta.url)), '')

export default defineConfig({
  resolve: {
    alias: {
      '#imports': fileURLToPath(
        new URL('./server/backend/lib/test-setup/nuxt-imports.ts', import.meta.url)
      ),
    },
  },
  test: {
    env,
    silent: true,
  },
})

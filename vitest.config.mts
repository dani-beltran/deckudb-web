import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

const aliases = {
  '@server': fileURLToPath(new URL('./server', import.meta.url)),
  '@app': fileURLToPath(new URL('./app', import.meta.url)),
  '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
}

export default defineConfig({
  resolve: {
    alias: aliases,
  },
  test: {
    globalSetup: ['test/mongodb.global-setup.ts'],
    projects: [
      {
        resolve: {
          alias: aliases,
        },
        test: {
          name: 'unit',
          environment: 'node',
          env: {
            NUXT_NODE_ENV: 'test',
          },
          include: ['test/**/*.test.ts'],
          exclude: ['test/integration/**/*.test.ts', 'test/e2e/**/*.test.ts'],
        },        
      },
      {
        resolve: {
          alias: aliases,
        },
        test: {
          name: 'api',
          environment: 'node',
          env: {
            NUXT_MONGODB_DATABASE: 'deckudb-api',
            NUXT_NODE_ENV: 'test',
          },
          include: ['test/integration/api/**/*.test.ts'],
          setupFiles: ['test/server.setup.ts'],
        },        
      },
      await defineVitestProject({
        test: {
          name: 'e2e',
          environment: 'nuxt',
          // Browser navigation can exceed Vitest's 5-second Node default on shared CI runners.
          testTimeout: 15_000,
          env: {
            NUXT_MONGODB_DATABASE: 'deckudb-e2e',
            NUXT_NODE_ENV: 'test',
          },
          include: ['test/e2e/**/*.test.ts'],
        },
      }),
    ],
  },
})

import { fileURLToPath } from 'node:url'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

const serverAlias = {
  '@server': fileURLToPath(new URL('./server', import.meta.url)),
}

export default defineConfig({
  resolve: {
    alias: serverAlias,
  },
  test: {
    globalSetup: ['test/mongodb.global-setup.ts'],
    projects: [
      {
        resolve: {
          alias: serverAlias,
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
          alias: serverAlias,
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

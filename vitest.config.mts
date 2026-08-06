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
    projects: [
      {
        resolve: {
          alias: serverAlias,
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['server/**/*.test.ts'],
          exclude: ['server/api/**/*.test.ts'],
        },        
      },
      {
        resolve: {
          alias: serverAlias,
        },
        test: {
          name: 'api',
          environment: 'node',
          include: ['test/integration/api/**/*.test.ts'],
          setupFiles: ['test/server.setup.ts'],
        },        
      },
      await defineVitestProject({
        test: {
          name: 'e2e',
          environment: 'nuxt',
          include: ['test/e2e/**/*.test.ts'],          
        },
      }),
    ],
  },
})

import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['server/**/*.test.ts'],
          exclude: ['server/api/**/*.test.ts'],
          setupFiles: ['test/server.setup.ts']
        },        
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['server/api/**/*.test.ts'],
          setupFiles: ['test/server.setup.ts']
        },        
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          environment: 'nuxt',
          include: ['test/**/*.test.ts'],
        },
      }),
    ],
  },
})

import { resolve } from 'node:path'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
        },
      },
      await defineVitestProject({
        resolve: {
          alias: {
            'bun:test': resolve('./vitest.config.ts'),
          },
        },
        test: {
          name: 'happy-dom',
          include: ['app/**/*.test.ts'],
        },
      }),
    ],
  },
})

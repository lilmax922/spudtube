import { resolve } from 'node:path'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            // nitropack/runtime needs Nitro's storage virtual modules, which do
            // not exist under vitest. Server handlers under test import it only
            // for defineCachedEventHandler; the stub mirrors its TTL/key/bypass
            // semantics with an in-memory store.
            'nitropack/runtime': resolve('./vitest.stubs/nitropack-runtime.ts'),
          },
        },
        test: {
          name: 'node',
          environment: 'node',
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
          setupFiles: ['vitest.node.setup.ts'],
          // Integration tests share the Docker Postgres and TRUNCATE CASCADE in
          // beforeEach — parallel files would wipe each other's fixtures.
          fileParallelism: false,
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
          setupFiles: ['vitest.happy-dom.setup.ts'],
          environmentOptions: {
            // The test nuxt forces ssr:false, which breaks nuxt-og-image's real
            // defineOgImage in the harness. Disabling the module makes it register
            // a no-op defineOgImage instead, so the SFCs' '#imports' named import
            // still compiles here (dev keeps the real renderer).
            nuxt: { overrides: { ogImage: { enabled: false } } },
          },
        },
      }),
    ],
  },
})

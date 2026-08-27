// @ts-check
import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    // Generated artifacts — never hand-edited.
    ignores: ['server/db/migrations/**', 'server/db/schema/auth.ts', 'worker-configuration.d.ts'],
    // @eslint/markdown 8.0.3 crashes (getLoc not implemented) when a
    // markdown file is verified twice in one run (e.g. combined with other
    // .md files); disable markdown linting until the upstream bug is fixed.
    markdown: false,
  }),
  {
    files: ['**/*.{js,mjs,ts,vue}'],
    rules: {
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    },
  },
  {
    files: ['app/components/ui/**/*.{js,mjs,ts,vue}'],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
)

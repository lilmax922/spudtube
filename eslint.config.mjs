// @ts-check
import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    // Generated artifacts — never hand-edited.
    ignores: ['server/db/migrations/**', 'server/db/schema/auth.ts', 'scripts/production-wizard.mjs'],
  }),
  {
    files: ['**/*.{js,mjs,ts,vue}'],
    rules: {
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    },
  },
)

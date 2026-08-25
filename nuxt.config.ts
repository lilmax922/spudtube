import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-23',
  modules: ['@nuxt/eslint', '@nuxtjs/i18n', '@nuxt/test-utils/module'],
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  imports: { autoImport: false },
  components: { dirs: [] },
  nitro: {
    preset: 'cloudflare_pages',
    imports: false,
    ignore: ['**/*.test.ts'],
    rollupConfig: {
      external: ['pg-native'],
    },
  },
  eslint: {
    config: { standalone: false },
  },
  typescript: { strict: true },
  devtools: { enabled: true },
  i18n: {
    // zh-TW is the product's primary market language, but a visitor with no country signal
    // renders en (spec: TW → zh-TW, everything else → en); the signal is applied per request
    // in app/middleware/language.global.ts, so this module-level default is the en fallback.
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    langDir: 'locales',
    locales: [
      { code: 'zh-TW', name: '繁體中文', language: 'zh-TW', file: 'zh-TW.json' },
      { code: 'en', name: 'English', language: 'en', file: 'en.json' },
    ],
  },
})

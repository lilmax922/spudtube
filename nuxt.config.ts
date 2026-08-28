import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-23',
  modules: ['@nuxt/eslint', '@nuxt/image', '@nuxtjs/i18n', '@nuxt/test-utils/module', 'motion-v/nuxt'],
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
  image: {
    // All remote artwork comes from TMDB; unlisted hosts (auth avatars) pass through untouched.
    domains: ['image.tmdb.org'],
    // Mirrors the design-system breakpoints (560/880/1280/1680) so `sizes` hints in components
    // can use the sm/md/lg/xl keys; responsive srcsets are built from TMDB's own size ladder
    // because IPX/sharp cannot run on the cloudflare_pages worker runtime.
    screens: { xs: 320, sm: 560, md: 880, lg: 1280, xl: 1680, xxl: 1920 },
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

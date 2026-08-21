import tailwindcss from '@tailwindcss/vite'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  modules: ['@nuxt/eslint', '@nuxt/test-utils/module'],
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  imports: { autoImport: false },
  components: { dirs: [] },
  nitro: {
    imports: false,
    ignore: ['**/*.test.ts'],
  },
  eslint: {
    config: { standalone: false },
  },
  typescript: { strict: true },
  devtools: { enabled: true },
})

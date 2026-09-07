import { describe, expect, it, vi } from 'vitest'

const locale = vi.hoisted(() => ({ value: 'en' }))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale }),
}))

const { useTmdbLanguage } = await import('./use-tmdb-language')

describe('use-tmdb-language', () => {
  it('maps zh-TW through and falls back to en for everything else', () => {
    locale.value = 'en'
    expect(useTmdbLanguage().value).toBe('en')

    locale.value = 'zh-TW'
    expect(useTmdbLanguage().value).toBe('zh-TW')

    locale.value = 'ja'
    expect(useTmdbLanguage().value).toBe('en')
  })
})

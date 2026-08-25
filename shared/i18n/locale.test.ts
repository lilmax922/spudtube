import { describe, expect, it } from 'vitest'
import {
  countryToLocale,
  FALLBACK_LOCALE,
  isAppLocale,
  readDetectedCountry,
  resolveDisplayLocale,
} from './locale'

describe('readDetectedCountry', () => {
  it('extracts a single-value country header', () => {
    expect(readDetectedCountry({ 'cf-ipcountry': 'TW' })).toBe('TW')
    expect(readDetectedCountry({ 'cf-ipcountry': 'US' })).toBe('US')
  })

  it('takes the first value of a multi-value header', () => {
    expect(readDetectedCountry({ 'cf-ipcountry': ['TW', 'US'] })).toBe('TW')
  })

  it('returns null when the header is absent or empty', () => {
    expect(readDetectedCountry({})).toBeNull()
    expect(readDetectedCountry({ 'cf-ipcountry': undefined })).toBeNull()
    expect(readDetectedCountry({ 'cf-ipcountry': [] })).toBeNull()
    expect(readDetectedCountry({ 'x-other': 'TW' })).toBeNull()
  })
})

describe('countryToLocale', () => {
  it('maps Taiwan and China to zh-TW', () => {
    expect(countryToLocale('TW')).toBe('zh-TW')
    expect(countryToLocale('CN')).toBe('zh-TW')
  })

  it('normalizes case and whitespace before mapping', () => {
    expect(countryToLocale(' tw ')).toBe('zh-TW')
    expect(countryToLocale('tw')).toBe('zh-TW')
    expect(countryToLocale('cn')).toBe('zh-TW')
    expect(countryToLocale(' CN ')).toBe('zh-TW')
  })

  it('maps every other country to en', () => {
    for (const country of ['US', 'HK', 'JP', 'KR', 'SG', 'GB', 'DE']) {
      expect(countryToLocale(country)).toBe('en')
    }
  })

  it('maps an absent or unrecognized signal to en', () => {
    for (const country of ['', '   ', 'XX', null, undefined]) {
      expect(countryToLocale(country)).toBe('en')
    }
  })
})

describe('isAppLocale', () => {
  it('accepts configured locale codes only', () => {
    expect(isAppLocale('zh-TW')).toBe(true)
    expect(isAppLocale('en')).toBe(true)
    expect(isAppLocale('fr')).toBe(false)
    expect(isAppLocale(null)).toBe(false)
    expect(isAppLocale(42)).toBe(false)
  })
})

describe('resolveDisplayLocale', () => {
  it('lets a persisted choice override the geo default permanently', () => {
    expect(resolveDisplayLocale('en', 'TW')).toBe('en')
    expect(resolveDisplayLocale('zh-TW', 'US')).toBe('zh-TW')
  })

  it('falls back to the geo default when nothing was persisted', () => {
    expect(resolveDisplayLocale(undefined, 'TW')).toBe('zh-TW')
    expect(resolveDisplayLocale(undefined, 'CN')).toBe('zh-TW')
    expect(resolveDisplayLocale(null, 'US')).toBe('en')
  })

  it('ignores persisted values that are not configured locales', () => {
    expect(resolveDisplayLocale('fr', 'TW')).toBe('zh-TW')
    expect(resolveDisplayLocale('fr', undefined)).toBe(FALLBACK_LOCALE)
  })

  it('resolves to en without any signal at all', () => {
    expect(resolveDisplayLocale(undefined, undefined)).toBe('en')
  })
})

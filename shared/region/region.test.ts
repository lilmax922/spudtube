import { describe, expect, it } from 'vitest'
import {
  countryToRegion,
  CURATED_REGIONS,
  DEFAULT_REGION,
  isCuratedRegion,
  resolveSelectedRegion,
} from './region'

describe('cURATED_REGIONS', () => {
  it('offers the 14 curated regions in display order', () => {
    expect(CURATED_REGIONS).toEqual([
      'TW',
      'HK',
      'JP',
      'KR',
      'SG',
      'US',
      'GB',
      'CA',
      'AU',
      'DE',
      'FR',
      'IN',
      'BR',
      'MX',
    ])
  })
})

describe('isCuratedRegion', () => {
  it('accepts curated codes only', () => {
    expect(isCuratedRegion('TW')).toBe(true)
    expect(isCuratedRegion('US')).toBe(true)
    expect(isCuratedRegion('TH')).toBe(false)
    expect(isCuratedRegion('tw')).toBe(false)
    expect(isCuratedRegion(null)).toBe(false)
    expect(isCuratedRegion(42)).toBe(false)
  })
})

describe('countryToRegion', () => {
  it('maps a curated country to its Region', () => {
    expect(countryToRegion('TW')).toBe('TW')
    expect(countryToRegion('JP')).toBe('JP')
  })

  it('normalizes case and whitespace before mapping', () => {
    expect(countryToRegion(' tw ')).toBe('TW')
    expect(countryToRegion('sg')).toBe('SG')
  })

  it('returns null for countries outside the curated list', () => {
    for (const country of ['TH', 'NL', 'EG', '', '   ', 'XX', null, undefined]) {
      expect(countryToRegion(country)).toBeNull()
    }
  })
})

describe('resolveSelectedRegion', () => {
  it('lets a persisted choice override the detected default', () => {
    expect(resolveSelectedRegion('JP', 'TW')).toBe('JP')
    expect(resolveSelectedRegion('US', 'TW')).toBe('US')
  })

  it('uses the detected country as default when nothing was persisted', () => {
    expect(resolveSelectedRegion(null, 'TW')).toBe('TW')
    expect(resolveSelectedRegion(undefined, 'SG')).toBe('SG')
  })

  it('ignores persisted values that are not curated regions', () => {
    expect(resolveSelectedRegion('TH', 'TW')).toBe('TW')
    expect(resolveSelectedRegion('th', 'US')).toBe('US')
  })

  it('falls back to the default region when the detected country is not curated', () => {
    expect(resolveSelectedRegion(undefined, 'TH')).toBe(DEFAULT_REGION)
    expect(resolveSelectedRegion(null, 'XX')).toBe(DEFAULT_REGION)
  })

  it('resolves to the default region without any signal at all', () => {
    expect(resolveSelectedRegion(undefined, undefined)).toBe(DEFAULT_REGION)
  })
})

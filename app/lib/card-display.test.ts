import { describe, expect, it } from 'vitest'
import { PROVIDER_CATALOG } from './availability-fixtures'
import {
  formatRatingText,
  HOVER_PROVIDER_LIMIT,
  resolveDiscoveryBadge,
  resolveHoverDescription,
  resolveHoverProviders,
  resolveReleaseYear,
} from './card-display'

describe('resolveDiscoveryBadge', () => {
  it('returns null while the membership sets are missing', () => {
    expect(resolveDiscoveryBadge(null, 419430)).toBeNull()
    expect(resolveDiscoveryBadge(undefined, 419430)).toBeNull()
  })

  it('returns null for non-members even with a high rating', () => {
    expect(resolveDiscoveryBadge({ trendingIds: [], topRatedIds: [] }, 419430)).toBeNull()
  })

  it('marks weekly trending members', () => {
    expect(resolveDiscoveryBadge({ trendingIds: [419430], topRatedIds: [] }, 419430)).toBe('card.badges.trending')
  })

  it('marks top-rated members and lets trending win on overlap', () => {
    expect(resolveDiscoveryBadge({ trendingIds: [], topRatedIds: [419430] }, 419430)).toBe('card.badges.topRated')
    expect(resolveDiscoveryBadge({ trendingIds: [419430], topRatedIds: [419430] }, 419430)).toBe('card.badges.trending')
  })

  it('ignores other titles in the same sets', () => {
    expect(resolveDiscoveryBadge({ trendingIds: [1], topRatedIds: [2] }, 419430)).toBeNull()
  })
})

describe('resolveHoverProviders', () => {
  it('returns an empty strip while the catalog is missing', () => {
    expect(resolveHoverProviders(null, 'TW')).toEqual([])
    expect(resolveHoverProviders(undefined, 'TW')).toEqual([])
  })

  it('returns an empty strip for regions absent from the catalog', () => {
    expect(resolveHoverProviders(PROVIDER_CATALOG, 'XX')).toEqual([])
  })

  it('reads subscription before free and only logo-carrying providers', () => {
    const providers = resolveHoverProviders(PROVIDER_CATALOG, 'TW')
    expect(providers.map(provider => provider.name)).toEqual(['CATCHPLAY+', 'Netflix'])
    expect(providers.every(provider => provider.logoPath != null)).toBe(true)
  })

  it('caps the strip at the hover limit', () => {
    expect(HOVER_PROVIDER_LIMIT).toBe(6)
    const many = {
      TW: {
        link: null,
        groups: {
          subscription: Array.from({ length: 10 }, (_, i) => ({
            id: i,
            name: `Provider ${i}`,
            logoPath: `/logo-${i}.jpg`,
          })),
          free: [],
          rent: [],
          buy: [],
        },
      },
    }
    expect(resolveHoverProviders(many, 'TW')).toHaveLength(6)
  })
})

describe('formatRatingText', () => {
  it('formats the vote average with one decimal', () => {
    expect(formatRatingText(7.8)).toBe('7.8')
  })

  it('falls back to a dash marker when unrated', () => {
    expect(formatRatingText(null)).toBe('—')
  })
})

describe('resolveReleaseYear', () => {
  it('reads the year from the release date', () => {
    expect(resolveReleaseYear('2021-10-22')).toBe('2021')
  })

  it('returns null when the date is missing', () => {
    expect(resolveReleaseYear(null)).toBeNull()
  })
})

describe('resolveHoverDescription', () => {
  it('keeps real overviews and drops blank ones', () => {
    expect(resolveHoverDescription('亞崔迪家族接受沙丘星的統治權。')).toBe('亞崔迪家族接受沙丘星的統治權。')
    expect(resolveHoverDescription(null)).toBeNull()
    expect(resolveHoverDescription(undefined)).toBeNull()
    expect(resolveHoverDescription('   ')).toBeNull()
  })
})

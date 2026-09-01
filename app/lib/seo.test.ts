import { describe, expect, it } from 'vitest'
import { buildCanonicalUrl, buildDetailDescription, buildDetailTitle, extractYear, getOgLocale, getOgLocaleAlternate, truncate } from './seo'

const ZH_TITLE = 'SpudTube - 拯救劇荒，快速找到今晚想看的電影與影集'
const ZH_DESC = '探索電影與影集，查看台灣串流上架資訊，收藏你的待看清單。從此告別「今晚看什麼」的選擇困難。'
const EN_TITLE = 'SpudTube - Discover Movies & TV Shows Worth Watching'
const EN_DESC = 'Discover movies and TV shows, check streaming availability, and manage your watchlists. No more "what to watch tonight" fatigue.'

// locale constants kept for completeness but also exercised via buildDetailDescription
void ZH_TITLE
void ZH_DESC
void EN_TITLE
void EN_DESC

describe('seo utils - truncate', () => {
  it('returns short text unchanged', () => {
    expect(truncate('hello', 150)).toBe('hello')
  })

  it('returns exactly 150 chars without ellipsis', () => {
    const text = 'a'.repeat(150)
    expect(truncate(text, 150)).toBe(text)
  })

  it('truncates at word boundary and adds ellipsis when over 150', () => {
    const words = Array.from({ length: 40 }).fill('word').join(' ')
    // words length > 150, should cut at last space before 150 and append ...
    const result = truncate(words, 150)
    expect(result.endsWith('...')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(153)
    // must not cut mid-word: before ... there should be full word
    const withoutEllipsis = result.slice(0, -3)
    expect(withoutEllipsis.endsWith(' ')).toBe(false)
    expect(withoutEllipsis.length).toBeLessThanOrEqual(150)
  })

  it('truncates no-space string at 150 with ellipsis', () => {
    const text = 'a'.repeat(200)
    const result = truncate(text, 150)
    expect(result).toBe(`${'a'.repeat(150)}...`)
  })

  it('handles empty string', () => {
    expect(truncate('', 150)).toBe('')
  })
})

describe('seo utils - extractYear', () => {
  it('extracts year from ISO date', () => {
    expect(extractYear('2021-10-22')).toBe('2021')
  })

  it('returns null for null or undefined', () => {
    expect(extractYear(null)).toBeNull()
    expect(extractYear(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractYear('')).toBeNull()
  })

  it('returns null for invalid date', () => {
    expect(extractYear('invalid')).toBeNull()
  })
})

describe('seo utils - buildDetailTitle', () => {
  it('includes year when releaseDate available', () => {
    expect(buildDetailTitle('沙丘', '2021-10-22')).toBe('沙丘 (2021) - SpudTube')
  })

  it('omits year segment when releaseDate missing', () => {
    expect(buildDetailTitle('沙丘', null)).toBe('沙丘 - SpudTube')
    expect(buildDetailTitle('沙丘', undefined)).toBe('沙丘 - SpudTube')
    expect(buildDetailTitle('沙丘', '')).toBe('沙丘 - SpudTube')
  })

  it('omits year for invalid date', () => {
    expect(buildDetailTitle('Dune', 'invalid')).toBe('Dune - SpudTube')
  })
})

describe('seo utils - buildDetailDescription', () => {
  it('uses truncated overview when non-empty (word-boundary, no title prefix)', () => {
    const overview = Array.from({ length: 50 }).fill('word').join(' ')
    const result = buildDetailDescription(overview, '沙丘', '2021-10-22', 'zh-TW')
    expect(result.endsWith('...')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(153)
    // should not prepend title/year when overview exists
    expect(result.startsWith('沙丘')).toBe(false)
  })

  it('returns overview unchanged when under 150', () => {
    const overview = 'Short overview.'
    expect(buildDetailDescription(overview, '沙丘', '2021-10-22', 'zh-TW')).toBe('Short overview.')
  })

  it('falls back to zh copy when overview empty with year', () => {
    expect(buildDetailDescription('', '沙丘', '2021-10-22', 'zh-TW'))
      .toBe('沙丘 (2021) 在 SpudTube 上的介紹、演員陣容與串流上架資訊。')
  })

  it('falls back to zh copy without year when releaseDate missing', () => {
    expect(buildDetailDescription('', '沙丘', null, 'zh-TW'))
      .toBe('沙丘 在 SpudTube 上的介紹、演員陣容與串流上架資訊。')
  })

  it('falls back to en copy when overview empty with year', () => {
    expect(buildDetailDescription('', 'Dune', '2021-10-22', 'en'))
      .toBe('Dune (2021) on SpudTube - cast, details and streaming availability.')
  })

  it('falls back to en copy without year when releaseDate missing', () => {
    expect(buildDetailDescription(null, 'Dune', null, 'en'))
      .toBe('Dune on SpudTube - cast, details and streaming availability.')
  })

  it('truncates long overview for en as well', () => {
    const overview = Array.from({ length: 60 }).fill('hello').join(' ')
    const result = buildDetailDescription(overview, 'Dune', '2021-10-22', 'en')
    expect(result.endsWith('...')).toBe(true)
    expect(result.includes('Dune (2021) on SpudTube')).toBe(false)
  })
})

describe('seo utils - getOgLocale', () => {
  it('returns zh_TW for zh-TW', () => {
    expect(getOgLocale('zh-TW')).toBe('zh_TW')
  })

  it('returns en_US for en', () => {
    expect(getOgLocale('en')).toBe('en_US')
  })

  it('returns en_US for unknown locale', () => {
    expect(getOgLocale('fr')).toBe('en_US')
  })
})

describe('seo utils - getOgLocaleAlternate', () => {
  it('returns en_US alternate for zh-TW', () => {
    expect(getOgLocaleAlternate('zh-TW')).toBe('en_US')
  })

  it('returns zh_TW alternate for en', () => {
    expect(getOgLocaleAlternate('en')).toBe('zh_TW')
  })

  it('returns zh_TW alternate for unknown locale', () => {
    expect(getOgLocaleAlternate('fr')).toBe('zh_TW')
  })
})

describe('seo utils - buildCanonicalUrl', () => {
  it('builds canonical with siteUrl and path', () => {
    expect(buildCanonicalUrl('https://spudtube.pages.dev', '/')).toBe('https://spudtube.pages.dev/')
    expect(buildCanonicalUrl('https://spudtube.pages.dev', '/movie/123')).toBe('https://spudtube.pages.dev/movie/123')
  })

  it('normalizes trailing slash on siteUrl', () => {
    expect(buildCanonicalUrl('https://spudtube.pages.dev/', '/')).toBe('https://spudtube.pages.dev/')
  })

  it('adds leading slash when path missing', () => {
    expect(buildCanonicalUrl('https://spudtube.pages.dev', 'movie/123')).toBe('https://spudtube.pages.dev/movie/123')
  })

  it('falls back to SEO_SITE_URL when siteUrl undefined', () => {
    expect(buildCanonicalUrl(undefined, '/')).toBe('https://spudtube.pages.dev/')
    expect(buildCanonicalUrl(undefined, '/tv/456')).toBe('https://spudtube.pages.dev/tv/456')
  })
})

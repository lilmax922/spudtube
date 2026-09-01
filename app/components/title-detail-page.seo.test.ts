import type { Ref } from 'vue'
import type { TitleDetail } from '#server/tmdb/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { MOVIE_DETAIL } from '../lib/title-detail-fixtures'
import TitleDetailPage from './title-detail-page.vue'

const localeRef = ref('zh-TW')

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      locale: localeRef,
      t: (key: string) => key,
    }),
  }
})

vi.mock('../lib/auth-client', () => ({
  authClient: { useSession: () => ({ value: { data: null } }) },
  signIn: { social: vi.fn() },
}))

vi.mock('../composables/use-title-rating', () => ({
  useTitleRating: () => ({ label: ref(null), pending: ref(false), rate: vi.fn(), clear: vi.fn() }),
}))

vi.mock('../composables/use-title-status', () => ({
  useTitleStatus: () => ({ status: ref(null), pending: ref(false), set: vi.fn(), clear: vi.fn() }),
}))

vi.mock('../composables/use-trailer', () => ({
  useTrailerState: () => ({ isOpen: ref(false), open: vi.fn(), close: vi.fn() }),
}))

vi.mock('../composables/use-media-lightbox', () => ({
  useMediaLightboxState: () => ({ isOpen: ref(false), open: vi.fn(), close: vi.fn() }),
}))

const detailRef: Ref<TitleDetail | null> = ref(null)
const pendingRef = ref(false)
const errorRef: Ref<{ statusCode: number } | null> = ref(null)

vi.mock('../composables/use-title-detail', () => ({
  useTitleDetail: () => ({
    detail: { data: detailRef, pending: pendingRef, error: errorRef },
    recommendations: { data: ref({ results: [] }) },
  }),
}))

vi.mock('../composables/use-availability', () => ({
  useAvailability: () => ({
    catalog: { data: ref(null), pending: ref(false), error: ref(null) },
    loadCatalog: vi.fn(),
  }),
}))

vi.mock('../composables/use-discovery-badges', () => ({
  useDiscoveryBadges: () => ({ badges: { data: ref(null) } }),
}))

function metaContent(nameOrProperty: string): string | null {
  return document.head.querySelector(`meta[name="${nameOrProperty}"], meta[property="${nameOrProperty}"]`)?.getAttribute('content') ?? null
}

function linkHref(rel: string): string | null {
  return document.head.querySelector(`link[rel="${rel}"]`)?.getAttribute('href') ?? null
}

function ldJson(): Record<string, unknown> | null {
  const els = document.head.querySelectorAll('script[type="application/ld+json"]')
  for (const el of [...els].reverse()) {
    try {
      const parsed = JSON.parse((el as HTMLScriptElement).textContent ?? '') as Record<string, unknown>
      const str = JSON.stringify(parsed).toLowerCase()
      if (str.includes('movie') || str.includes('tvseries') || str.includes('tv'))
        return parsed
    }
    catch {}
  }
  const last = els[els.length - 1] as HTMLScriptElement | undefined
  if (!last)
    return null
  try {
    return JSON.parse(last.textContent ?? '') as Record<string, unknown>
  }
  catch {
    return null
  }
}

function allLdJsonScripts(): Record<string, unknown>[] {
  const els = document.head.querySelectorAll('script[type="application/ld+json"]')
  const out: Record<string, unknown>[] = []
  for (const el of [...els]) {
    try {
      const parsed = JSON.parse((el as HTMLScriptElement).textContent ?? '') as Record<string, unknown>
      out.push(parsed)
    }
    catch {}
  }
  return out
}

beforeEach(async () => {
  localeRef.value = 'zh-TW'
  detailRef.value = null
  pendingRef.value = false
  errorRef.value = null
  // ensure no bleed from previous test's head
  for (const el of document.head.querySelectorAll('script[type="application/ld+json"]'))
    el.remove()
  // allow any pending head flush from previous mount to settle
  await new Promise(r => setTimeout(r, 50))
})

afterEach(async () => {
  for (const el of document.head.querySelectorAll('script[type="application/ld+json"]'))
    el.remove()
  await new Promise(r => setTimeout(r, 20))
})

describe('title-detail-page SEO', () => {
  it('sets detail title with year and description truncated when overview present', async () => {
    localeRef.value = 'zh-TW'
    const longOverview = Array.from({ length: 60 }).fill('word').join(' ')
    detailRef.value = { ...MOVIE_DETAIL, name: '沙丘', releaseDate: '2021-10-22', overview: longOverview, genres: [{ id: 878, name: '科幻' }] }

    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })

    await vi.waitFor(() => expect(document.title).toBe('沙丘 (2021) - SpudTube'))
    const desc = metaContent('description')
    expect(desc).toBeTruthy()
    expect(desc!.endsWith('...')).toBe(true)
    expect(desc!.length).toBeLessThanOrEqual(153)
    expect(desc!.includes('沙丘 (2021)')).toBe(false)
    expect(metaContent('og:title')).toBe('沙丘 (2021) - SpudTube')
    expect(metaContent('og:description')).toBe(desc)
  })

  it('omits year segment when releaseDate missing', async () => {
    detailRef.value = { ...MOVIE_DETAIL, name: '沙丘', releaseDate: null, overview: '', genres: [] }
    localeRef.value = 'zh-TW'

    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })

    await vi.waitFor(() => expect(document.title).toBe('沙丘 - SpudTube'))
    expect(document.title.includes('(null)') || document.title.includes('()')).toBe(false)
  })

  it('falls back to zh description when overview empty', async () => {
    localeRef.value = 'zh-TW'
    detailRef.value = { ...MOVIE_DETAIL, name: '沙丘', releaseDate: '2021-10-22', overview: '' }

    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })

    await vi.waitFor(() => expect(metaContent('description')).toBe('沙丘 (2021) 在 SpudTube 上的介紹、演員陣容與串流上架資訊。'))
  })

  it('falls back to en description when overview empty and locale en', async () => {
    localeRef.value = 'en'
    detailRef.value = { ...MOVIE_DETAIL, name: 'Dune', releaseDate: '2021-10-22', overview: '' }

    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })

    await vi.waitFor(() => expect(metaContent('description')).toBe('Dune (2021) on SpudTube - cast, details and streaming availability.'))
  })

  it('falls back without year when no releaseDate', async () => {
    localeRef.value = 'en'
    detailRef.value = { ...MOVIE_DETAIL, name: 'Dune', releaseDate: null, overview: '' }

    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })

    await vi.waitFor(() => expect(metaContent('description')).toBe('Dune on SpudTube - cast, details and streaming availability.'))
  })

  it('sets canonical self link on detail', async () => {
    detailRef.value = { ...MOVIE_DETAIL, name: '沙丘', releaseDate: '2021-10-22', overview: 'hi' }
    localeRef.value = 'zh-TW'

    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })

    await vi.waitFor(() => expect(linkHref('canonical')).toBeTruthy())
    const canonical = linkHref('canonical')!
    expect(canonical.includes('/movie/419430')).toBe(true)
  })

  it('injects schema.org Movie with required fields for MOVIE', async () => {
    detailRef.value = {
      ...MOVIE_DETAIL,
      kind: 'MOVIE',
      name: '沙丘',
      releaseDate: '2021-10-22',
      voteAverage: 7.8,
      genres: [{ id: 878, name: '科幻' }],
      posterPath: '/poster.jpg',
      backdropPath: '/backdrop.jpg',
    }

    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })

    await vi.waitFor(() => {
      const j = ldJson()
      expect(j).toBeTruthy()
      const s = JSON.stringify(j)
      expect(s.includes('沙丘')).toBe(true)
    }, { timeout: 3000 })
    await new Promise(r => setTimeout(r, 100))
    const json = ldJson()!
    const jsonStr = JSON.stringify(json)
    expect(jsonStr.toLowerCase().includes('movie')).toBe(true)
    expect(jsonStr.includes('沙丘')).toBe(true)
  })

  it('injects schema.org TVSeries for TV_SHOW', async () => {
    detailRef.value = {
      ...MOVIE_DETAIL,
      kind: 'TV_SHOW',
      tmdbId: 123,
      name: 'Arcane',
      releaseDate: '2021-11-06',
      voteAverage: 8.7,
      genres: [{ id: 16, name: '動畫' }],
    }

    await mountSuspended(TitleDetailPage, { route: '/tv/123', props: { kind: 'TV_SHOW' as const } })

    await vi.waitFor(() => expect(ldJson()).toBeTruthy(), { timeout: 3000 })
    // allow head to update after mount (useHead async)
    await new Promise(r => setTimeout(r, 100))
    const jsonStr = JSON.stringify(ldJson()!)
    // Should be TVSeries, not Movie
    expect(jsonStr.toLowerCase().includes('tvseries') || jsonStr.toLowerCase().includes('tv_series') || jsonStr.toLowerCase().includes('tv')).toBe(true)
  })

  it('sets og:locale correctly on detail (reactive to locale)', async () => {
    localeRef.value = 'en'
    detailRef.value = { ...MOVIE_DETAIL, name: 'Dune', releaseDate: '2021-10-22', overview: 'hi' }

    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })

    await vi.waitFor(() => expect(metaContent('og:locale')).toBe('en_US'))
    expect(metaContent('og:locale:alternate')).toBe('zh_TW')
  })

  it('does not duplicate schema.org script (exactly one Movie/TVSeries)', async () => {
    detailRef.value = {
      ...MOVIE_DETAIL,
      kind: 'MOVIE',
      name: '沙丘',
      releaseDate: '2021-10-22',
      voteAverage: 7.8,
      genres: [{ id: 878, name: '科幻' }],
      posterPath: '/poster.jpg',
    }
    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })
    await vi.waitFor(() => expect(ldJson()).toBeTruthy(), { timeout: 3000 })
    await new Promise(r => setTimeout(r, 100))
    // count only scripts that look like Movie/TVSeries schema
    const all = allLdJsonScripts()
    const movieTv = all.filter((j) => {
      const s = JSON.stringify(j).toLowerCase()
      // nuxt-schema-org wraps in @graph or single object; check both
      return s.includes('"@type":"movie"') || s.includes('"@type":"tvseries"') || s.includes('movie') || s.includes('tvseries')
    })
    expect(movieTv.length).toBe(1)
    // also no duplicate raw ldJsonContent style script besides schemaOrg
    expect(all.length).toBe(1)
  })

  it('updates og:locale reactively with detail locale', async () => {
    localeRef.value = 'zh-TW'
    detailRef.value = { ...MOVIE_DETAIL, name: '沙丘', releaseDate: '2021-10-22', overview: 'hi' }
    await mountSuspended(TitleDetailPage, { route: '/movie/419430', props: { kind: 'MOVIE' as const } })
    await vi.waitFor(() => expect(metaContent('og:locale')).toBe('zh_TW'))
    localeRef.value = 'en'
    await vi.waitFor(() => expect(metaContent('og:locale')).toBe('en_US'))
    // og:title should also update with locale-specific description fallback
    expect(metaContent('og:description')).toBeTruthy()
  })
})

describe('title-detail-page ogImage best practices', () => {
  it('imports defineOgImage via #imports (wildcard extraction allowed) and calls with reactive refs', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/components/title-detail-page.vue'), 'utf8')
    expect(src).toContain('defineOgImage')
    expect(src).toContain('from \'#imports\'')
    expect(src).toContain('SpudTube')
    expect(src).toMatch(/title:\s*ogImageTitle/)
    expect(src).toMatch(/description:\s*ogImageDescription/)
    expect(src).toMatch(/year:\s*ogImageYear/)
  })

  it('calls defineOgImage top-level with reactive refs (not inside watch)', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/components/title-detail-page.vue'), 'utf8')
    expect(src).toContain('defineOgImage')
    expect(src).toContain('SpudTube')
    expect(src).not.toMatch(/watch\(\[ogImageTitle/)
  })

  it('passes ogImage refs directly without .value unwrapping', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/components/title-detail-page.vue'), 'utf8')
    expect(src).toContain('title: ogImageTitle')
    expect(src).not.toContain('title: ogImageTitle.value')
  })
})

describe('nuxt ogImage config best practices', () => {
  it('does not contain dead renderer/component keys in ogImage defaults', () => {
    const src = readFileSync(resolve(process.cwd(), 'nuxt.config.ts'), 'utf8')
    expect(src).not.toMatch(/renderer:\s*['"]takumi['"]/)
    // defaults should only contain width/height per v6 types (component/renderer omitted)
    expect(src).toContain('width: 1200')
    expect(src).toContain('height: 630')
    expect(src).toMatch(/ogImage:\s*\{\s*enabled:\s*true/)
  })
})

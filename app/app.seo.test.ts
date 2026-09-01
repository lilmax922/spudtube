import type { Genre, TitleSummary } from '#server/tmdb/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import App from './app.vue'

const localeRef = ref('zh-TW')

const mock = vi.hoisted(() => ({
  browse: {
    refresh: vi.fn(),
    loadMore: vi.fn(),
    setKind: vi.fn(),
    toggleGenre: vi.fn(),
    clearGenres: vi.fn(),
    setMinRating: vi.fn(),
    toggleProvider: vi.fn(),
    clearProviders: vi.fn(),
    clearFilters: vi.fn(),
  },
  search: {
    search: vi.fn(),
    clear: vi.fn(),
  },
  overlaySearch: {
    search: vi.fn(),
    clear: vi.fn(),
    loadMore: vi.fn(),
  },
  navigateTo: vi.fn(),
}))

mockNuxtImport('navigateTo', () => mock.navigateTo)

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      locale: localeRef,
      t: (key: string) => key,
      locales: [
        { code: 'zh-TW', name: '繁體中文' },
        { code: 'en', name: 'English' },
      ],
      setLocale: vi.fn(async (code: string) => { localeRef.value = code }),
    }),
  }
})

const browseState = {
  kind: ref<'MOVIE' | 'TV_SHOW'>('MOVIE'),
  selectedGenreIds: ref<number[]>([]),
  minRating: ref<number | null>(null),
  selectedProviderIds: ref<number[]>([]),
  availableProviders: ref<{ id: number, name: string, logoPath: string | null }[]>([]),
  genres: ref<Genre[]>([]),
  items: ref<TitleSummary[]>([]),
  loading: ref(false),
  loadingMore: ref(false),
  error: ref(false),
}

const searchState = {
  query: ref(''),
  searchedQuery: ref(''),
  mode: ref<'browse' | 'search'>('browse'),
  items: ref<TitleSummary[]>([]),
  page: ref(0),
  totalPages: ref(0),
  loading: ref(false),
  loadingMore: ref(false),
  error: ref(false),
  hasMore: ref(false),
}

vi.mock('./composables/use-browse-grid', () => ({
  useBrowseGrid: () => ({
    ...browseState,
    refresh: mock.browse.refresh,
    loadMore: mock.browse.loadMore,
    setKind: mock.browse.setKind,
    toggleGenre: mock.browse.toggleGenre,
    clearGenres: mock.browse.clearGenres,
    setMinRating: mock.browse.setMinRating,
    toggleProvider: mock.browse.toggleProvider,
    clearProviders: mock.browse.clearProviders,
    clearFilters: mock.browse.clearFilters,
  }),
}))

vi.mock('./composables/use-search-state', () => ({
  useSearchState: () => ({
    ...searchState,
    search: mock.search.search,
    clear: mock.search.clear,
  }),
}))

vi.mock('./composables/use-keyword-search', () => ({
  useKeywordSearch: () => ({
    query: ref(''),
    searchedQuery: ref(''),
    items: ref<TitleSummary[]>([]),
    page: ref(0),
    totalPages: ref(0),
    loading: ref(false),
    loadingMore: ref(false),
    error: ref(false),
    hasMore: ref(false),
    search: mock.overlaySearch.search,
    loadMore: mock.overlaySearch.loadMore,
    clear: mock.overlaySearch.clear,
  }),
}))

vi.mock('./lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: ref(null) }),
  },
  signIn: { social: vi.fn() },
  signOut: vi.fn(),
}))

const ZH_TITLE = 'SpudTube - 拯救劇荒，快速找到今晚想看的電影與影集'
const ZH_DESC = '探索電影與影集，查看台灣串流上架資訊，收藏你的待看清單。從此告別「今晚看什麼」的選擇困難。'
const EN_TITLE = 'SpudTube - Discover Movies & TV Shows Worth Watching'
const EN_DESC = 'Discover movies and TV shows, check streaming availability, and manage your watchlists. No more "what to watch tonight" fatigue.'

function metaContent(nameOrProperty: string): string | null {
  const el = document.head.querySelector(`meta[name="${nameOrProperty}"], meta[property="${nameOrProperty}"]`)
  return el?.getAttribute('content') ?? null
}

function linkHref(rel: string): string | null {
  return document.head.querySelector(`link[rel="${rel}"]`)?.getAttribute('href') ?? null
}

beforeEach(() => {
  localeRef.value = 'zh-TW'
  mock.navigateTo.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('global SEO head', () => {
  it('sets zh-TW title and description when locale zh-TW', async () => {
    localeRef.value = 'zh-TW'
    await mountSuspended(App, { route: '/' })
    await vi.waitFor(() => expect(document.title).toBe(ZH_TITLE))
    expect(metaContent('description')).toBe(ZH_DESC)
  })

  it('sets en title and description when locale en', async () => {
    localeRef.value = 'en'
    await mountSuspended(App, { route: '/' })
    await vi.waitFor(() => expect(document.title).toBe(EN_TITLE))
    expect(metaContent('description')).toBe(EN_DESC)
  })

  it('sets og:title and og:description matching locale', async () => {
    localeRef.value = 'zh-TW'
    await mountSuspended(App, { route: '/' })
    await vi.waitFor(() => expect(metaContent('og:title')).toBe(ZH_TITLE))
    expect(metaContent('og:description')).toBe(ZH_DESC)

    localeRef.value = 'en'
    await vi.waitFor(() => expect(metaContent('og:title')).toBe(EN_TITLE))
    expect(metaContent('og:description')).toBe(EN_DESC)
  })

  it('sets og:locale zh_TW for zh-TW and en_US for en with alternate', async () => {
    localeRef.value = 'zh-TW'
    await mountSuspended(App, { route: '/' })
    await vi.waitFor(() => expect(metaContent('og:locale')).toBe('zh_TW'))
    expect(metaContent('og:locale:alternate')).toBe('en_US')

    localeRef.value = 'en'
    await vi.waitFor(() => expect(metaContent('og:locale')).toBe('en_US'))
    expect(metaContent('og:locale:alternate')).toBe('zh_TW')
  })

  it('sets canonical link', async () => {
    localeRef.value = 'en'
    await mountSuspended(App, { route: '/' })
    await vi.waitFor(() => expect(linkHref('canonical')).toBeTruthy())
    const canonical = linkHref('canonical')!
    expect(canonical.includes('spudtube.pages.dev') || canonical.includes('http')).toBe(true)
  })

  it('updates title reactively when locale switches', async () => {
    localeRef.value = 'zh-TW'
    await mountSuspended(App, { route: '/' })
    await vi.waitFor(() => expect(document.title).toBe(ZH_TITLE))
    localeRef.value = 'en'
    await vi.waitFor(() => expect(document.title).toBe(EN_TITLE))
  })

  it('updates og:title and og:description reactively (ogImage locale)', async () => {
    localeRef.value = 'zh-TW'
    await mountSuspended(App, { route: '/' })
    await vi.waitFor(() => expect(metaContent('og:title')).toBe(ZH_TITLE))
    localeRef.value = 'en'
    await vi.waitFor(() => expect(metaContent('og:title')).toBe(EN_TITLE))
    expect(metaContent('og:description')).toBe(EN_DESC)
  })

  it('sets html lang attribute via useHead', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/app.vue'), 'utf8')
    expect(src).toContain('htmlAttrs')
    expect(src).toContain('lang: locale.value')
  })
})

describe('global ogImage best practices', () => {
  it('imports defineOgImage via #imports (wildcard allowed) and calls with reactive refs', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/app.vue'), 'utf8')
    expect(src).toContain('defineOgImage')
    expect(src).toContain('from \'#imports\'')
    // should call with localeTitle / localeDescription refs, not plain strings inside watch
    expect(src).toContain('SpudTube')
    expect(src).toMatch(/title:\s*localeTitle/)
    expect(src).toMatch(/description:\s*localeDescription/)
  })

  it('calls defineOgImage top-level with reactive refs (not inside watch)', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/app.vue'), 'utf8')
    expect(src).toContain('defineOgImage')
    expect(src).toContain('SpudTube')
    expect(src).not.toMatch(/watch\(\[localeTitle/)
    // must not be inside a watch callback with destructured [title, description]
    expect(src).not.toMatch(/watch\(\[localeTitle,\s*localeDescription\]/)
  })

  it('passes locale refs directly (no .value unwrapping in call)', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/app.vue'), 'utf8')
    const defCall = src.match(/_def\([\s\S]*?\)/)?.[0] ?? src.match(/defineOgImage\([\s\S]*?\)/)?.[0] ?? ''
    expect(defCall).toContain('localeTitle')
    expect(defCall).toContain('localeDescription')
    expect(defCall).not.toContain('localeTitle.value')
    expect(defCall).not.toContain('localeDescription.value')
  })
})

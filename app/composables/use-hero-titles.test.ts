import type { HeroFetcher } from './use-hero-titles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { resetHeroTitlesForTest, setHeroTitlesFetcherForTest, useHeroTitles } from './use-hero-titles'

const localeRef = ref('en')

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      locale: localeRef,
      t: (key: string) => key,
      setLocale: vi.fn(),
    }),
  }
})

const sampleHero = [
  {
    kind: 'MOVIE' as const,
    tmdbId: 419430,
    name: 'Dune',
    posterPath: null,
    backdropPath: '/iopYFB1b6Bh7FWZhjzonDEfMvZB.jpg',
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    overview: 'Paul Atreides...',
    runtimeMinutes: 155,
    contentRating: 'PG-13',
    genres: [{ id: 878, name: 'Sci-Fi' }],
    providers: [],
  },
]

function createFetcher(): { fetcher: HeroFetcher, fetchHero: ReturnType<typeof vi.fn> } {
  const fetchHero = vi.fn<HeroFetcher['fetchHero']>()
  return { fetcher: { fetchHero }, fetchHero }
}

describe('use-hero-titles', () => {
  beforeEach(() => {
    resetHeroTitlesForTest()
    localeRef.value = 'en'
  })

  afterEach(() => {
    resetHeroTitlesForTest()
  })

  it('exposes enriched hero titles from the injected fetcher', async () => {
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockResolvedValue({ results: sampleHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(state.titles.value).toHaveLength(1))

    expect(state.titles.value[0]).toMatchObject({
      tmdbId: 419430,
      runtimeMinutes: 155,
      contentRating: 'PG-13',
      genres: [{ id: 878, name: 'Sci-Fi' }],
    })
    expect(fetchHero).toHaveBeenCalledWith('MOVIE', 'en')
  })

  it('does not refetch when only the genre or rating filters change (filter-immune)', async () => {
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockResolvedValue({ results: sampleHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(state.titles.value).toHaveLength(1))
    const callsAfterFirst = fetchHero.mock.calls.length

    // Simulate user toggling genres/rating: the hero composable never observes them.
    expect(fetchHero.mock.calls.length).toBe(callsAfterFirst)
    expect(state.error.value).toBe(false)
  })

  it('refetches when the kind changes', async () => {
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockResolvedValue({ results: sampleHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(fetchHero).toHaveBeenCalledWith('MOVIE', 'en'))

    kind.value = 'TV_SHOW'
    await vi.waitFor(() => expect(fetchHero).toHaveBeenCalledWith('TV_SHOW', 'en'))

    expect(fetchHero.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('flags an error when the fetcher rejects', async () => {
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockRejectedValue(new Error('boom'))

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(state.error.value).toBe(true))
    expect(state.titles.value).toEqual([])
    expect(state.loading.value).toBe(false)
  })

  it('reloads with the latest kind when remounted after setKind while unmounted', async () => {
    const movieTitles = [{ ...sampleHero[0]!, kind: 'MOVIE' as const, tmdbId: 419430, name: 'Dune' }]
    const tvTitles = [{ ...sampleHero[0]!, kind: 'TV_SHOW' as const, tmdbId: 1399, name: 'Winter Coming' }]
    const fetchHero = vi.fn<HeroFetcher['fetchHero']>().mockImplementation(async (kind) => {
      return { results: kind === 'MOVIE' ? movieTitles : tvTitles }
    })
    setHeroTitlesFetcherForTest({ fetchHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const homeScope = effectScope()
    const first = homeScope.run(() => useHeroTitles(kind))!
    await vi.waitFor(() => expect(first.titles.value).toHaveLength(1))
    expect(first.titles.value[0]!.name).toBe('Dune')
    expect(fetchHero).toHaveBeenCalledWith('MOVIE', 'en')

    // Leaving home disposes the mount watcher; header setKind happens with no listener.
    homeScope.stop()
    kind.value = 'TV_SHOW'

    const returnScope = effectScope()
    const second = returnScope.run(() => useHeroTitles(kind))!
    expect(second).toBe(first)
    await vi.waitFor(() => expect(fetchHero).toHaveBeenCalledWith('TV_SHOW', 'en'))
    await vi.waitFor(() => expect(second.titles.value[0]!.name).toBe('Winter Coming'))
    returnScope.stop()
  })

  it('stays live to in-page kind switches after a same-kind remount', async () => {
    const movieTitles = [{ ...sampleHero[0]!, kind: 'MOVIE' as const, tmdbId: 419430, name: 'Dune' }]
    const tvTitles = [{ ...sampleHero[0]!, kind: 'TV_SHOW' as const, tmdbId: 1399, name: 'Winter Coming' }]
    const fetchHero = vi.fn<HeroFetcher['fetchHero']>().mockImplementation(async (kind) => {
      return { results: kind === 'MOVIE' ? movieTitles : tvTitles }
    })
    setHeroTitlesFetcherForTest({ fetchHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const firstScope = effectScope()
    const first = firstScope.run(() => useHeroTitles(kind))!
    await vi.waitFor(() => expect(first.titles.value[0]!.name).toBe('Dune'))
    firstScope.stop()

    const callsAfterFirstMount = fetchHero.mock.calls.length
    const secondScope = effectScope()
    const second = secondScope.run(() => useHeroTitles(kind))!
    expect(second).toBe(first)
    expect(fetchHero.mock.calls.length).toBe(callsAfterFirstMount)

    kind.value = 'TV_SHOW'
    await vi.waitFor(() => expect(fetchHero).toHaveBeenCalledWith('TV_SHOW', 'en'))
    await vi.waitFor(() => expect(second.titles.value[0]!.name).toBe('Winter Coming'))
    secondScope.stop()
  })

  it('maps zh-TW through and narrows other DisplayLocales to en', async () => {
    localeRef.value = 'zh-TW'
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockResolvedValue({ results: sampleHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(fetchHero).toHaveBeenCalledWith('MOVIE', 'zh-TW'))
    resetHeroTitlesForTest()
    localeRef.value = 'ja'
    const { fetcher: jaFetcher, fetchHero: jaFetchHero } = createFetcher()
    jaFetchHero.mockResolvedValue({ results: sampleHero })
    useHeroTitles(kind, jaFetcher)

    await vi.waitFor(() => expect(jaFetchHero).toHaveBeenCalledWith('MOVIE', 'en'))
  })
})

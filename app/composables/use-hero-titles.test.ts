import type { Page, TitleSummary } from '#server/tmdb/types'
import type { HeroFetcher } from './use-hero-titles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { resetHeroTitlesForTest, useHeroTitles } from './use-hero-titles'

const localeRef = ref('en')

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({ locale: localeRef, t: (key: string) => key }),
  }
})

function createFakeFetcher() {
  const fetchTrending = vi.fn<HeroFetcher['fetchTrending']>()
  return { fetcher: { fetchTrending }, fetchTrending }
}

function page(results: TitleSummary[]): Page<TitleSummary> {
  return { page: 1, results, totalPages: 1, totalResults: results.length }
}

const topOne: TitleSummary = {
  kind: 'MOVIE',
  tmdbId: 100,
  name: 'Top One',
  posterPath: null,
  backdropPath: '/backdrop1.jpg',
  releaseDate: '2024-01-01',
  voteAverage: 9.0,
  genreIds: [],
}

const topTwo: TitleSummary = {
  kind: 'MOVIE',
  tmdbId: 200,
  name: 'Top Two',
  posterPath: null,
  backdropPath: '/backdrop2.jpg',
  releaseDate: '2023-01-01',
  voteAverage: 8.0,
  genreIds: [],
}

describe('use-hero-titles', () => {
  beforeEach(() => {
    localeRef.value = 'en'
    resetHeroTitlesForTest()
  })

  it('fetches trending titles for the current kind and sorts by vote average', async () => {
    const { fetcher, fetchTrending } = createFakeFetcher()
    fetchTrending.mockResolvedValue(page([topTwo, topOne]))

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchTrending).toHaveBeenCalledWith('MOVIE', 1, 'en')
    expect(state.titles.value.map(t => t.name)).toEqual(['Top One', 'Top Two'])
    expect(state.loading.value).toBe(false)
    expect(state.error.value).toBe(false)
  })

  it('refetches when the kind flips', async () => {
    const { fetcher, fetchTrending } = createFakeFetcher()
    fetchTrending.mockResolvedValue(page([topOne]))

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    useHeroTitles(kind, fetcher)
    await new Promise(resolve => setTimeout(resolve, 0))

    kind.value = 'TV_SHOW'
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchTrending).toHaveBeenCalledTimes(2)
    expect(fetchTrending).toHaveBeenNthCalledWith(2, 'TV_SHOW', 1, 'en')
  })

  it('caps the hero rail at 5 titles even if trending returns more', async () => {
    const manyTitles: TitleSummary[] = Array.from({ length: 8 }, (_, i) => ({
      kind: 'MOVIE' as const,
      tmdbId: 1000 + i,
      name: `Title ${i}`,
      posterPath: null,
      backdropPath: `/bd-${i}.jpg`,
      releaseDate: '2020-01-01',
      voteAverage: 5 + i * 0.3,
      genreIds: [],
    }))
    const { fetcher, fetchTrending } = createFakeFetcher()
    fetchTrending.mockResolvedValue(page(manyTitles))

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(state.titles.value).toHaveLength(5)
  })

  it('flags an error when the trending fetch fails', async () => {
    const { fetcher, fetchTrending } = createFakeFetcher()
    fetchTrending.mockRejectedValue(new Error('boom'))

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(state.error.value).toBe(true)
    expect(state.loading.value).toBe(false)
  })
})

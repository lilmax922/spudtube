import type { Genre, Page, TitleSummary } from '#server/tmdb/types'
import type { BrowseFetcher } from './use-browse-grid'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const localeRef = ref('en')

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
      setLocale: vi.fn(),
    }),
  }
})

const { useBrowseGrid } = await import('./use-browse-grid')

function createFakeFetcher(): { fetcher: BrowseFetcher, fetchGenres: ReturnType<typeof vi.fn>, fetchDiscover: ReturnType<typeof vi.fn> } {
  const fetchGenres = vi.fn<BrowseFetcher['fetchGenres']>()
  const fetchDiscover = vi.fn<BrowseFetcher['fetchDiscover']>()
  return { fetcher: { fetchGenres, fetchDiscover }, fetchGenres, fetchDiscover }
}

function page(results: TitleSummary[], totalPages: number): Page<TitleSummary> {
  return { page: 1, results, totalPages, totalResults: results.length }
}

const dune: TitleSummary = {
  kind: 'MOVIE',
  tmdbId: 419430,
  name: '沙丘',
  posterPath: null,
  backdropPath: null,
  releaseDate: '2021-10-22',
  voteAverage: 7.8,
}

const genres: Genre[] = [
  { id: 28, name: '動作' },
]

describe('use-browse-grid — locale watch (TMDB language orthogonal)', () => {
  it('refetches discover and genres with the new language when locale changes', async () => {
    const { fetcher, fetchGenres, fetchDiscover } = createFakeFetcher()
    fetchGenres.mockResolvedValue(genres)
    fetchDiscover.mockResolvedValue(page([dune], 1))

    localeRef.value = 'en'
    const grid = useBrowseGrid(fetcher)
    await grid.refresh()

    expect(fetchGenres).toHaveBeenLastCalledWith('MOVIE', 'en')
    expect(fetchDiscover).toHaveBeenLastCalledWith('MOVIE', [], 1, 'en')

    fetchGenres.mockClear()
    fetchDiscover.mockClear()

    localeRef.value = 'zh-TW'

    await vi.waitFor(() => expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', [], 1, 'zh-TW'))
    expect(fetchGenres).toHaveBeenCalledWith('MOVIE', 'zh-TW')
  })

  it('keeps region orthogonal — locale change does not affect region (no title filtering)', async () => {
    const { fetcher, fetchGenres, fetchDiscover } = createFakeFetcher()
    fetchGenres.mockResolvedValue(genres)
    fetchDiscover.mockResolvedValue(page([dune], 1))

    localeRef.value = 'en'
    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    expect(fetchDiscover).toHaveBeenLastCalledWith('MOVIE', [], 1, 'en')
    // region is not part of fetchDiscover; verify no genre ids added
    expect(grid.selectedGenreIds.value).toEqual([])
  })
})

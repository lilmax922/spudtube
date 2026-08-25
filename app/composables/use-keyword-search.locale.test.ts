import type { Page, TitleSummary } from '#server/tmdb/types'
import type { SearchFetcher } from './use-keyword-search'
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

const { useKeywordSearch } = await import('./use-keyword-search')

function createFakeFetcher(): { fetcher: SearchFetcher, fetchSearch: ReturnType<typeof vi.fn> } {
  const fetchSearch = vi.fn<SearchFetcher['fetchSearch']>()
  return { fetcher: { fetchSearch }, fetchSearch }
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

describe('use-keyword-search — locale watch (TMDB language)', () => {
  it('re-fetches the current search with the new language when locale changes while in search mode', async () => {
    const { fetcher, fetchSearch } = createFakeFetcher()
    fetchSearch.mockResolvedValue(page([dune], 1))

    localeRef.value = 'en'
    const search = useKeywordSearch(fetcher)
    await search.search('dune')
    expect(fetchSearch).toHaveBeenLastCalledWith('dune', 1, 'en')

    fetchSearch.mockClear()
    localeRef.value = 'zh-TW'

    await vi.waitFor(() => expect(fetchSearch).toHaveBeenCalledWith('dune', 1, 'zh-TW'))
  })

  it('does not refetch when locale changes outside search mode (browse)', async () => {
    const { fetcher, fetchSearch } = createFakeFetcher()
    fetchSearch.mockResolvedValue(page([dune], 1))

    localeRef.value = 'en'
    const _search = useKeywordSearch(fetcher)
    // no search yet, mode is browse
    fetchSearch.mockClear()
    localeRef.value = 'zh-TW'

    // give watch a tick but expect no fetch
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(fetchSearch).not.toHaveBeenCalled()
  })
})

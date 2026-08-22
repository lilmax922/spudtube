import type { Page, TitleSummary } from '#server/tmdb/types'
import type { SearchFetcher } from './use-keyword-search'
import { describe, expect, it, vi } from 'vitest'
import { useKeywordSearch } from './use-keyword-search'

function createFakeFetcher() {
  const fetchSearch = vi.fn<SearchFetcher['fetchSearch']>()
  return { fetcher: { fetchSearch }, fetchSearch }
}

function page(results: TitleSummary[], totalPages: number, pageNumber = 1): Page<TitleSummary> {
  return { page: pageNumber, results, totalPages, totalResults: results.length }
}

const dune: TitleSummary = {
  kind: 'MOVIE',
  tmdbId: 419430,
  name: '沙丘',
  posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
  backdropPath: null,
  releaseDate: '2021-10-22',
  voteAverage: 7.8,
}

const duneTv: TitleSummary = {
  kind: 'TV_SHOW',
  tmdbId: 84773,
  name: '沙丘：預言',
  posterPath: null,
  backdropPath: null,
  releaseDate: '2024-11-17',
  voteAverage: 7.2,
}

describe('use-keyword-search', () => {
  it('searches both kinds at once with the trimmed query and stores the first page', async () => {
    const { fetcher, fetchSearch } = createFakeFetcher()
    fetchSearch.mockResolvedValue(page([dune, duneTv], 4))

    const search = useKeywordSearch(fetcher)
    await search.search('  dune  ')

    expect(fetchSearch).toHaveBeenCalledWith('dune', 1)
    expect(search.query.value).toBe('dune')
    expect(search.searchedQuery.value).toBe('dune')
    expect(search.items.value).toEqual([dune, duneTv])
    expect(search.hasMore.value).toBe(true)
    expect(search.error.value).toBe(false)
  })

  it('resets state on an empty query without fetching', async () => {
    const { fetcher, fetchSearch } = createFakeFetcher()
    fetchSearch.mockResolvedValue(page([dune], 1))

    const search = useKeywordSearch(fetcher)
    await search.search('dune')
    search.clear()

    expect(fetchSearch).toHaveBeenCalledTimes(1)
    expect(search.query.value).toBe('')
    expect(search.searchedQuery.value).toBe('')
    expect(search.items.value).toEqual([])
    expect(search.hasMore.value).toBe(false)
    expect(search.loading.value).toBe(false)

    await search.search('   ')
    expect(fetchSearch).toHaveBeenCalledTimes(1)
    expect(search.items.value).toEqual([])
  })

  it('appends the next page on loadMore and stops at the last page', async () => {
    const { fetcher, fetchSearch } = createFakeFetcher()
    fetchSearch.mockResolvedValueOnce(page([dune], 2))
    fetchSearch.mockResolvedValueOnce({ page: 2, results: [duneTv], totalPages: 2, totalResults: 2 })

    const search = useKeywordSearch(fetcher)
    await search.search('dune')
    await search.loadMore()

    expect(fetchSearch).toHaveBeenLastCalledWith('dune', 2)
    expect(search.items.value).toEqual([dune, duneTv])
    expect(search.page.value).toBe(2)
    expect(search.hasMore.value).toBe(false)

    await search.loadMore()
    expect(fetchSearch).toHaveBeenCalledTimes(2)
  })

  it('flags an error when the first page fails to load', async () => {
    const { fetcher, fetchSearch } = createFakeFetcher()
    fetchSearch.mockRejectedValue(new Error('boom'))

    const search = useKeywordSearch(fetcher)
    await search.search('dune')

    expect(search.error.value).toBe(true)
    expect(search.loading.value).toBe(false)
    expect(search.items.value).toEqual([])
  })

  it('loads more pages with the last submitted query, not the live input', async () => {
    const { fetcher, fetchSearch } = createFakeFetcher()
    fetchSearch.mockResolvedValueOnce(page([dune], 2))
    fetchSearch.mockResolvedValueOnce({ page: 2, results: [duneTv], totalPages: 2, totalResults: 2 })

    const search = useKeywordSearch(fetcher)
    await search.search('dune')

    search.query.value = 'du'

    await search.loadMore()

    expect(fetchSearch).toHaveBeenLastCalledWith('dune', 2)
    expect(search.items.value).toEqual([dune, duneTv])
  })

  it('discards an in-flight page append when a new query is searched', async () => {
    const { fetcher, fetchSearch } = createFakeFetcher()
    let resolvePending: ((value: Page<TitleSummary>) => void) | undefined
    fetchSearch.mockResolvedValueOnce(page([dune], 2))
    fetchSearch.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePending = resolve
    }))
    fetchSearch.mockResolvedValue(page([duneTv], 1))

    const search = useKeywordSearch(fetcher)
    await search.search('dune')

    const pending = search.loadMore()
    void search.search('prophecy')

    resolvePending?.(page([duneTv], 2))

    await pending
    await vi.waitFor(() => expect(search.items.value).toEqual([duneTv]))

    expect(search.page.value).toBe(1)
    expect(search.loadingMore.value).toBe(false)
    expect(fetchSearch).toHaveBeenLastCalledWith('prophecy', 1)
  })
})

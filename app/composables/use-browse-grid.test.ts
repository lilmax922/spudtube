import type { Genre, Page, TitleSummary } from '#server/tmdb/types'
import type { BrowseFetcher } from './use-browse-grid'
import { describe, expect, it, vi } from 'vitest'
import { useBrowseGrid } from './use-browse-grid'

function createFakeFetcher() {
  const fetchGenres = vi.fn<BrowseFetcher['fetchGenres']>()
  const fetchDiscover = vi.fn<BrowseFetcher['fetchDiscover']>()
  const fetchProviders = vi.fn<BrowseFetcher['fetchProviders']>()
  const fetchProviderList = vi.fn<BrowseFetcher['fetchProviderList']>()
  fetchProviders.mockResolvedValue(new Map())
  fetchProviderList.mockResolvedValue([])
  return { fetcher: { fetchGenres, fetchDiscover, fetchProviders, fetchProviderList } as unknown as BrowseFetcher, fetchGenres, fetchDiscover, fetchProviders, fetchProviderList }
}

function page(results: TitleSummary[], totalPages: number): Page<TitleSummary> {
  return { page: 1, results, totalPages, totalResults: results.length }
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

const duneTwo: TitleSummary = {
  kind: 'MOVIE',
  tmdbId: 693134,
  name: '沙丘：第二部',
  posterPath: null,
  backdropPath: null,
  releaseDate: '2024-02-27',
  voteAverage: 8.1,
}

const genres: Genre[] = [
  { id: 28, name: '動作' },
  { id: 878, name: '科幻' },
]

describe('use-browse-grid', () => {
  const baseOptions = { genreIds: [] as number[], minRating: null as number | null, providerIds: [] as number[], page: 1, language: 'en' }

  it('loads genres and the first page for the default kind', async () => {
    const { fetcher, fetchGenres, fetchDiscover } = createFakeFetcher()
    fetchGenres.mockResolvedValue(genres)
    fetchDiscover.mockResolvedValue(page([dune], 5))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()

    expect(grid.kind.value).toBe('MOVIE')
    expect(fetchGenres).toHaveBeenCalledWith('MOVIE', 'en')
    expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', baseOptions)
    expect(grid.genres.value).toEqual(genres)
    expect(grid.items.value).toEqual([dune])
    expect(grid.hasMore.value).toBe(true)
  })

  it('switches kind, resets the genre selection, and refetches', async () => {
    const { fetcher, fetchGenres, fetchDiscover } = createFakeFetcher()
    fetchGenres.mockResolvedValue(genres)
    fetchDiscover.mockResolvedValue(page([dune], 5))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    grid.toggleGenre(28)
    await grid.refresh()

    expect(grid.selectedGenreIds.value).toEqual([28])
    grid.setKind('TV_SHOW')

    await vi.waitFor(() => expect(fetchDiscover).toHaveBeenCalledWith('TV_SHOW', baseOptions))
    expect(grid.selectedGenreIds.value).toEqual([])
    expect(fetchGenres).toHaveBeenCalledWith('TV_SHOW', 'en')
  })

  it('unions multiple selected genres by passing them all to discover', async () => {
    const { fetcher, fetchDiscover } = createFakeFetcher()
    fetchDiscover.mockResolvedValue(page([dune], 5))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    grid.toggleGenre(28)
    grid.toggleGenre(878)

    await vi.waitFor(() =>
      expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', { ...baseOptions, genreIds: [28, 878] }),
    )
    expect(grid.selectedGenreIds.value).toEqual([28, 878])

    grid.toggleGenre(28)
    await vi.waitFor(() =>
      expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', { ...baseOptions, genreIds: [878] }),
    )
  })

  it('clears the genre selection and refetches the first page', async () => {
    const { fetcher, fetchDiscover } = createFakeFetcher()
    fetchDiscover.mockResolvedValue(page([dune], 5))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    grid.toggleGenre(28)
    grid.clearGenres()

    await vi.waitFor(() => expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', baseOptions))
    expect(grid.selectedGenreIds.value).toEqual([])
  })

  it('passes minRating to the discover fetcher when set', async () => {
    const { fetcher, fetchDiscover } = createFakeFetcher()
    fetchDiscover.mockResolvedValue(page([dune], 5))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    grid.setMinRating(7)

    await vi.waitFor(() =>
      expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', { ...baseOptions, minRating: 7 }),
    )
  })

  it('does not refetch when setMinRating is called with the same value', async () => {
    const { fetcher, fetchDiscover } = createFakeFetcher()
    fetchDiscover.mockResolvedValue(page([dune], 5))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    const callsAfterRefresh = fetchDiscover.mock.calls.length

    grid.setMinRating(null)
    expect(fetchDiscover.mock.calls.length).toBe(callsAfterRefresh)
  })

  it('appends the next page on loadMore and stops at the last page', async () => {
    const { fetcher, fetchDiscover } = createFakeFetcher()
    fetchDiscover.mockResolvedValueOnce(page([dune], 2))
    fetchDiscover.mockResolvedValueOnce({ page: 2, results: [duneTwo], totalPages: 2, totalResults: 2 })

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    await grid.loadMore()

    expect(fetchDiscover).toHaveBeenLastCalledWith('MOVIE', { ...baseOptions, page: 2 })
    expect(grid.items.value).toEqual([dune, duneTwo])
    expect(grid.page.value).toBe(2)
    expect(grid.hasMore.value).toBe(false)

    await grid.loadMore()
    expect(fetchDiscover).toHaveBeenCalledTimes(2)
  })

  it('flags an error when the first page fails to load', async () => {
    const { fetcher, fetchGenres, fetchDiscover } = createFakeFetcher()
    fetchGenres.mockRejectedValue(new Error('boom'))
    fetchDiscover.mockResolvedValue(page([dune], 5))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()

    expect(grid.error.value).toBe(true)
    expect(grid.loading.value).toBe(false)
  })

  it('discards an in-flight page append when the grid refreshes', async () => {
    const { fetcher, fetchGenres, fetchDiscover } = createFakeFetcher()
    let resolvePending: ((value: Page<TitleSummary>) => void) | undefined
    fetchGenres.mockResolvedValue([])
    fetchDiscover.mockResolvedValueOnce(page([dune], 2))
    fetchDiscover.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePending = resolve
    }))
    fetchDiscover.mockResolvedValue(page([duneTwo], 1))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()

    const pending = grid.loadMore()
    grid.toggleGenre(28)

    resolvePending?.(page([duneTwo], 1))

    await pending
    await vi.waitFor(() => expect(grid.items.value).toEqual([duneTwo]))

    expect(grid.page.value).toBe(1)
    expect(grid.loadingMore.value).toBe(false)
  })

  it('toggles provider filter and refetches discover with providerIds', async () => {
    const { fetcher, fetchDiscover } = createFakeFetcher()
    fetchDiscover.mockResolvedValue(page([dune], 1))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    fetchDiscover.mockClear()

    grid.toggleProvider(8)

    await vi.waitFor(() =>
      expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ providerIds: [8] })),
    )
    expect(grid.selectedProviderIds.value).toEqual([8])

    fetchDiscover.mockClear()
    grid.toggleProvider(8)
    await vi.waitFor(() =>
      expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ providerIds: [] })),
    )
    expect(grid.selectedProviderIds.value).toEqual([])
  })

  it('exposes availableProviders from fetchProviderList (global), not from current page items', async () => {
    const globalProviders = [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
      { id: 119, name: 'Prime Video', logoPath: '/prime.jpg' },
      { id: 337, name: 'Disney Plus', logoPath: '/disney.jpg' },
    ]
    const fetchProviderList = vi.fn().mockResolvedValue(globalProviders)
    const { fetcher, fetchGenres, fetchDiscover } = createFakeFetcher()
    ;(fetcher as unknown as Record<string, unknown>).fetchProviderList = fetchProviderList
    fetchGenres.mockResolvedValue(genres)
    fetchDiscover.mockResolvedValue(page([dune], 1))

    const grid = useBrowseGrid(fetcher as unknown as import('./use-browse-grid').BrowseFetcher)
    await grid.refresh()

    await vi.waitFor(() => expect(grid.availableProviders.value.length).toBe(3))
    expect(grid.availableProviders.value.map(p => p.id).sort((a, b) => a - b)).toEqual([8, 119, 337])
    // Should not be derived from current page's ids (dune alone would only give its own providers)
    expect(fetchProviderList).toHaveBeenCalled()
  })

  it('clearFilters resets providerIds and refetches', async () => {
    const { fetcher, fetchDiscover } = createFakeFetcher()
    fetchDiscover.mockResolvedValue(page([dune], 1))
    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    grid.toggleProvider(8)
    await vi.waitFor(() => expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ providerIds: [8] })))
    fetchDiscover.mockClear()
    grid.toggleGenre(28)
    await vi.waitFor(() => expect(fetchDiscover).toHaveBeenCalled())
    fetchDiscover.mockClear()
    grid.clearFilters()
    await vi.waitFor(() => expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ providerIds: [], genreIds: [] })))
    expect(grid.selectedProviderIds.value).toEqual([])
    expect(grid.selectedGenreIds.value).toEqual([])
    expect(grid.minRating.value).toBeNull()
  })
})

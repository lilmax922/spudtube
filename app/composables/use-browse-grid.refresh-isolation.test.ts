import type { Page, TitleSummary } from '#server/tmdb/types'
import type { BrowseFetcher } from './use-browse-grid'
import { describe, expect, it, vi } from 'vitest'
import { useBrowseGrid } from './use-browse-grid'

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

const genres = [
  { id: 28, name: '動作' },
  { id: 878, name: '科幻' },
]

describe('use-browse-grid refresh fault isolation', () => {
  it('assigns genres/providers even when discover stalls', async () => {
    const fetchGenres = vi.fn<BrowseFetcher['fetchGenres']>().mockResolvedValue(genres)
    // Never-settling discover: the production stall shape. refresh() may stay
    // pending, but filter metadata must still land so the filter bar renders.
    const fetchDiscover = vi.fn<BrowseFetcher['fetchDiscover']>(() => new Promise(() => {}))
    const fetchProviders = vi.fn<BrowseFetcher['fetchProviders']>().mockResolvedValue(new Map())
    const fetchProviderList = vi.fn<BrowseFetcher['fetchProviderList']>().mockResolvedValue([
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
    ])
    const fetcher = { fetchGenres, fetchDiscover, fetchProviders, fetchProviderList } as unknown as BrowseFetcher

    const grid = useBrowseGrid(fetcher)
    // Intentionally not awaited: discover never settles.
    void grid.refresh()

    await vi.waitFor(() => expect(grid.genres.value).toEqual(genres), { timeout: 800 })
    await vi.waitFor(() => expect(grid.popularProviders.value).toHaveLength(1), { timeout: 800 })
  }, 10_000)

  it('still flags an error when genres rejects fast', async () => {
    const fetchGenres = vi.fn<BrowseFetcher['fetchGenres']>().mockRejectedValue(new Error('boom'))
    const fetchDiscover = vi.fn<BrowseFetcher['fetchDiscover']>().mockResolvedValue(page([dune], 1))
    const fetchProviders = vi.fn<BrowseFetcher['fetchProviders']>().mockResolvedValue(new Map())
    const fetchProviderList = vi.fn<BrowseFetcher['fetchProviderList']>().mockResolvedValue([])
    const fetcher = { fetchGenres, fetchDiscover, fetchProviders, fetchProviderList } as unknown as BrowseFetcher

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()

    expect(grid.error.value).toBe(true)
  }, 10_000)

  it('converts a synchronously-throwing genres fetcher into a grid error instead of escaping', async () => {
    const fetchGenres = vi.fn<BrowseFetcher['fetchGenres']>(() => {
      throw new Error('sync boom')
    })
    const fetchDiscover = vi.fn<BrowseFetcher['fetchDiscover']>().mockResolvedValue(page([dune], 1))
    const fetchProviders = vi.fn<BrowseFetcher['fetchProviders']>().mockResolvedValue(new Map())
    const fetchProviderList = vi.fn<BrowseFetcher['fetchProviderList']>().mockResolvedValue([])
    const fetcher = { fetchGenres, fetchDiscover, fetchProviders, fetchProviderList } as unknown as BrowseFetcher

    const grid = useBrowseGrid(fetcher)
    // Must resolve: the sync throw becomes a leg rejection, and the other
    // legs (discover) still settle.
    await grid.refresh()

    expect(grid.error.value).toBe(true)
    expect(grid.items.value).toHaveLength(1)
  }, 10_000)

  it('falls back to empty providers when the provider-list fetcher throws synchronously', async () => {
    const fetchGenres = vi.fn<BrowseFetcher['fetchGenres']>().mockResolvedValue(genres)
    const fetchDiscover = vi.fn<BrowseFetcher['fetchDiscover']>().mockResolvedValue(page([dune], 1))
    const fetchProviders = vi.fn<BrowseFetcher['fetchProviders']>().mockResolvedValue(new Map())
    const fetchProviderList = vi.fn<BrowseFetcher['fetchProviderList']>(() => {
      throw new Error('sync boom')
    })
    const fetcher = { fetchGenres, fetchDiscover, fetchProviders, fetchProviderList } as unknown as BrowseFetcher

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()

    expect(grid.popularProviders.value).toEqual([])
    expect(grid.genres.value).toEqual(genres)
    expect(grid.error.value).toBe(false)
  }, 10_000)
})

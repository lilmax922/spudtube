import type { Page, TitleSummary } from '#server/tmdb/types'
import type { TrendingFetcher } from './use-trending'
import { describe, expect, it, vi } from 'vitest'
import { deriveTrendingNames, interleaveTitles, useTrending } from './use-trending'

function title(kind: 'MOVIE' | 'TV_SHOW', tmdbId: number, name: string): TitleSummary {
  return {
    kind,
    tmdbId,
    name,
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-01-01',
    voteAverage: 7.5,
  }
}

function page(results: TitleSummary[]): Page<TitleSummary> {
  return { page: 1, results, totalPages: 1, totalResults: results.length }
}

function createFakeFetcher() {
  const fetchTrending = vi.fn<TrendingFetcher['fetchTrending']>()
  return { fetcher: { fetchTrending } as TrendingFetcher, fetchTrending }
}

describe('use-trending', () => {
  it('fetches both kinds once and interleaves the all tab', async () => {
    const { fetcher, fetchTrending } = createFakeFetcher()
    fetchTrending.mockImplementation(async kind =>
      page([1, 2, 3].map(n => title(kind, n, `${kind} ${n}`))),
    )

    const trending = useTrending(fetcher)
    fetchTrending.mockClear()
    await trending.refresh()

    expect(fetchTrending).toHaveBeenCalledTimes(2)
    expect(fetchTrending).toHaveBeenCalledWith('MOVIE', 'en')
    expect(fetchTrending).toHaveBeenCalledWith('TV_SHOW', 'en')
    expect(trending.movieTitles.value.map(t => t.name)).toEqual(['MOVIE 1', 'MOVIE 2', 'MOVIE 3'])
    expect(trending.allTitles.value.map(t => t.name)).toEqual([
      'MOVIE 1',
      'TV_SHOW 1',
      'MOVIE 2',
      'TV_SHOW 2',
      'MOVIE 3',
      'TV_SHOW 3',
    ])
  })

  it('derives chips from the same fetch without a second request', async () => {
    const { fetcher, fetchTrending } = createFakeFetcher()
    fetchTrending.mockImplementation(async kind =>
      page([title(kind, 1, 'Dune'), title(kind, 2, 'Dune'), title(kind, 3, '  ')]),
    )

    const trending = useTrending(fetcher)
    fetchTrending.mockClear()
    await trending.refresh()

    expect(fetchTrending).toHaveBeenCalledTimes(2)
    expect(trending.names.value).toEqual(['Dune'])
  })

  it('keeps the surviving kind when the other fails', async () => {
    const { fetcher, fetchTrending } = createFakeFetcher()
    fetchTrending.mockImplementation(async (kind) => {
      if (kind === 'TV_SHOW')
        throw new Error('upstream hiccup')
      return page([title(kind, 1, 'Dune')])
    })

    const trending = useTrending(fetcher)
    await trending.refresh()

    expect(trending.error.value).toBe(false)
    expect(trending.movieTitles.value).toHaveLength(1)
    expect(trending.tvTitles.value).toHaveLength(0)
  })

  it('reports an error only when both kinds fail', async () => {
    const { fetcher, fetchTrending } = createFakeFetcher()
    fetchTrending.mockRejectedValue(new Error('outage'))

    const trending = useTrending(fetcher)
    await trending.refresh()

    expect(trending.error.value).toBe(true)
  })
})

describe('interleaveTitles', () => {
  it('alternates movies and shows up to the limit', () => {
    const movies = [title('MOVIE', 1, 'M1'), title('MOVIE', 2, 'M2')]
    const shows = [title('TV_SHOW', 3, 'S1')]
    expect(interleaveTitles(movies, shows, 4).map(t => t.name)).toEqual(['M1', 'S1', 'M2'])
  })
})

describe('deriveTrendingNames', () => {
  it('skips blanks and duplicates within the cap', () => {
    const movies = [title('MOVIE', 1, 'Dune'), title('MOVIE', 2, '  ')]
    const shows = [title('TV_SHOW', 3, 'Dune'), title('TV_SHOW', 4, 'Severance')]
    expect(deriveTrendingNames(movies, shows, 6)).toEqual(['Dune', 'Severance'])
  })
})

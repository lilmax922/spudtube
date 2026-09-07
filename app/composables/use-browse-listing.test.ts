import type { BrowseSection } from '#server/api/browse/sections.get'
import type { Genre, Page, TitleSummary } from '#server/tmdb/types'
import type { BrowseFetcher } from './use-browse-grid'
import type { SectionsFetcher } from './use-browse-sections'
import type { SearchFetcher } from './use-keyword-search'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBrowseListingForTest, useBrowseListing } from './use-browse-listing'

function title(tmdbId: number, name: string): TitleSummary {
  return {
    kind: 'MOVIE',
    tmdbId,
    name,
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-01-01',
    voteAverage: 7.5,
  }
}

function page(results: TitleSummary[], totalPages = 1): Page<TitleSummary> {
  return { page: 1, results, totalPages, totalResults: results.length }
}

const dune = title(419430, '沙丘')
const genres: Genre[] = [{ id: 28, name: '動作' }]

function horrorRow(): BrowseSection {
  return {
    key: 'movie.horror',
    titleKey: 'browse.sections.movieHorror',
    expandable: true,
    genres: [27],
    minRating: null,
    query: { source: 'discover', genreIds: [27], minVoteCount: 100 },
    titles: [dune],
  }
}

function trendingRow(): BrowseSection {
  return {
    key: 'movie.trending',
    titleKey: 'browse.sections.movieTrending',
    expandable: false,
    genres: [],
    minRating: null,
    query: { source: 'trending', trendingWindow: 'week' },
    titles: [dune],
  }
}

function createFakes() {
  const fetchGenres = vi.fn<BrowseFetcher['fetchGenres']>().mockResolvedValue(genres)
  const fetchDiscover = vi.fn<BrowseFetcher['fetchDiscover']>().mockResolvedValue(page([dune], 2))
  const fetchProviders = vi.fn<BrowseFetcher['fetchProviders']>().mockResolvedValue(new Map())
  const fetchProviderList = vi.fn<BrowseFetcher['fetchProviderList']>().mockResolvedValue([])
  const fetchSearch = vi.fn<SearchFetcher['fetchSearch']>().mockResolvedValue(page([dune], 2))
  const fetchSections = vi.fn<SectionsFetcher['fetchSections']>().mockResolvedValue([horrorRow(), trendingRow()])
  return {
    fetchers: {
      browse: { fetchGenres, fetchDiscover, fetchProviders, fetchProviderList },
      search: { fetchSearch },
      sections: { fetchSections },
    },
    fetchGenres,
    fetchDiscover,
    fetchSearch,
    fetchSections,
  }
}

beforeEach(() => {
  resetBrowseListingForTest()
})

describe('use-browse-listing', () => {
  it('loads filters, sections, and the first grid page through one refresh', async () => {
    const { fetchers, fetchGenres, fetchDiscover, fetchSections } = createFakes()

    const listing = useBrowseListing(fetchers)
    await listing.refresh()

    expect(listing.mode.value).toBe('browse')
    expect(fetchGenres).toHaveBeenCalledWith('MOVIE', 'en')
    expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ page: 1 }))
    expect(fetchSections).toHaveBeenCalledWith('MOVIE', 'en')
    expect(listing.items.value).toEqual([dune])
    expect(listing.rows.value).toHaveLength(2)
    expect(listing.rows.value[0]).toMatchObject({
      key: 'movie.horror',
      titleKey: 'browse.sections.movieHorror',
      canSeeMore: true,
    })
    expect(listing.rows.value[1]).toMatchObject({ key: 'movie.trending', canSeeMore: false })
  })

  it('replays a row with a single refresh instead of the toggle storm', async () => {
    const { fetchers, fetchDiscover } = createFakes()

    const listing = useBrowseListing(fetchers)
    await listing.refresh()
    fetchDiscover.mockClear()

    await listing.applySection('movie.horror')

    expect(fetchDiscover).toHaveBeenCalledTimes(1)
    expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ genreIds: [27], page: 1 }))
    expect(listing.selectedGenreIds.value).toEqual([27])
  })

  it('ignores applySection for genre-less rows', async () => {
    const { fetchers, fetchDiscover } = createFakes()

    const listing = useBrowseListing(fetchers)
    await listing.refresh()
    fetchDiscover.mockClear()

    await listing.applySection('movie.trending')

    expect(fetchDiscover).not.toHaveBeenCalled()
    expect(listing.selectedGenreIds.value).toEqual([])
  })

  it('switches to search mode and back through the shared session', async () => {
    const { fetchers, fetchSearch } = createFakes()
    fetchSearch.mockResolvedValue(page([title(84773, '沙丘：預言')], 1))

    const listing = useBrowseListing(fetchers)
    await listing.refresh()

    await listing.search('dune')

    expect(listing.mode.value).toBe('search')
    expect(listing.searchedQuery.value).toBe('dune')
    expect(listing.items.value).toEqual([title(84773, '沙丘：預言')])

    listing.clearSearch()

    expect(listing.mode.value).toBe('browse')
    expect(listing.items.value).toEqual([dune])
  })

  it('routes loadMore to the active mode only', async () => {
    const { fetchers, fetchDiscover, fetchSearch } = createFakes()

    const listing = useBrowseListing(fetchers)
    await listing.refresh()

    await listing.loadMore()
    expect(fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ page: 2 }))
    expect(fetchSearch).not.toHaveBeenCalled()

    await listing.search('dune')
    fetchDiscover.mockClear()
    fetchSearch.mockClear()

    await listing.loadMore()
    expect(fetchSearch).toHaveBeenCalledWith('dune', 2, 'en')
    expect(fetchDiscover).not.toHaveBeenCalled()
  })
})

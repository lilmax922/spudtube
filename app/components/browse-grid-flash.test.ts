import type { VueWrapper } from '@vue/test-utils'
import type { BrowseSection } from '#server/api/browse/sections.get'
import type { Genre, Page, TitleSummary } from '#server/tmdb/types'
import type { BrowseFetcher } from '../composables/use-browse-grid'
import type { SectionsFetcher } from '../composables/use-browse-sections'
import type { SearchFetcher } from '../composables/use-keyword-search'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetBrowseListingForTest, useBrowseListing } from '../composables/use-browse-listing'
import BrowseGrid from './browse-grid.vue'

const titles: TitleSummary[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: 'Dune',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: null,
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [28],
  },
  {
    kind: 'MOVIE',
    tmdbId: 693134,
    name: 'Dune Part Two',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-02-27',
    voteAverage: 8.1,
    genreIds: [878],
  },
]

const genres: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 878, name: 'Sci-Fi' },
]

function page(results: TitleSummary[], totalPages = 1): Page<TitleSummary> {
  return { page: 1, results, totalPages, totalResults: results.length }
}

function trendingRow(): BrowseSection {
  return {
    key: 'movie.trending',
    titleKey: 'browse.sections.movieTrending',
    expandable: false,
    genres: [],
    minRating: null,
    query: { source: 'trending', trendingWindow: 'week' },
    titles,
  }
}

const fakes = vi.hoisted(() => ({
  fetchGenres: vi.fn(),
  fetchDiscover: vi.fn(),
  fetchProviders: vi.fn(),
  fetchProviderList: vi.fn(),
  fetchSearch: vi.fn(),
  fetchSections: vi.fn(),
}))

function seedListing() {
  fakes.fetchGenres.mockResolvedValue(genres)
  fakes.fetchDiscover.mockResolvedValue(page(titles))
  fakes.fetchProviders.mockResolvedValue(new Map())
  fakes.fetchProviderList.mockResolvedValue([])
  fakes.fetchSearch.mockResolvedValue(page([]))
  fakes.fetchSections.mockResolvedValue([trendingRow()])
  return useBrowseListing({
    browse: {
      fetchGenres: fakes.fetchGenres,
      fetchDiscover: fakes.fetchDiscover,
      fetchProviders: fakes.fetchProviders,
      fetchProviderList: fakes.fetchProviderList,
    } as unknown as BrowseFetcher,
    search: { fetchSearch: fakes.fetchSearch } as unknown as SearchFetcher,
    sections: { fetchSections: fakes.fetchSections } as unknown as SectionsFetcher,
  })
}

const mountedWrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
  resetBrowseListingForTest()
  vi.clearAllMocks()
})

describe('browse-grid flash regression: should always show carousel when unfiltered', () => {
  it('initial loading with no filters must show carousel rows, not grid skeleton', async () => {
    seedListing()
    let releaseGrid!: (value: Page<TitleSummary>) => void
    let releaseSections!: (value: BrowseSection[]) => void
    fakes.fetchDiscover.mockReturnValueOnce(new Promise<Page<TitleSummary>>(resolve => releaseGrid = resolve))
    fakes.fetchSections.mockReturnValueOnce(new Promise<BrowseSection[]>(resolve => releaseSections = resolve))
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await wrapper.vm.$nextTick()

    const html = wrapper.html()
    const root = wrapper.element as HTMLElement
    const rowsContainer = root.querySelector('.rows')
    expect(rowsContainer, 'expected carousel rows skeleton while unfiltered loading, but got grid').not.toBeNull()
    expect(html.includes('grid-cols-[repeat(auto-fill'), 'unfiltered loading should not render grid skeleton').toBe(false)

    releaseGrid(page(titles))
    releaseSections([trendingRow()])
    await vi.waitFor(() => expect(wrapper.text()).toContain('Dune'))
  })

  it('with data and no filters must show rows (carousel), not grid', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    await wrapper.vm.$nextTick()

    const root = wrapper.element as HTMLElement
    expect(root.querySelector('.rows'), 'expected rows container when unfiltered with data').toBeTruthy()
  })

  it('with genre filter active must show grid, not carousel', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    listing.toggleGenre(28)
    await wrapper.vm.$nextTick()

    const root = wrapper.element as HTMLElement
    expect(root.querySelector('.rows'), 'should not have rows when filtered by genre').toBeNull()
    // Should have grid
    expect(root.innerHTML.includes('grid-cols')).toBe(true)
  })

  it('with minRating filter active must show grid, not carousel', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    listing.setMinRating(7)
    await wrapper.vm.$nextTick()

    const root = wrapper.element as HTMLElement
    expect(root.querySelector('.rows'), 'should not have rows when filtered by minRating').toBeNull()
  })

  it('loading with data already present and no filter should stay in rows mode, not flip to grid', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    await wrapper.vm.$nextTick()

    let release!: (value: Page<TitleSummary>) => void
    fakes.fetchDiscover.mockReturnValueOnce(new Promise<Page<TitleSummary>>(resolve => release = resolve))
    const pending = listing.refresh()
    await wrapper.vm.$nextTick()

    const root = wrapper.element as HTMLElement
    expect(root.querySelector('.rows'), 'warm reload with no filter should stay in rows mode').toBeTruthy()

    release(page(titles))
    await pending
  })
})

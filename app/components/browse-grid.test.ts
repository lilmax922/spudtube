import type { VueWrapper } from '@vue/test-utils'
import type { BrowseSection } from '#server/api/browse/sections.get'
import type { Genre, Page, TitleSummary } from '#server/tmdb/types'
import type { BrowseFetcher } from '../composables/use-browse-grid'
import type { SectionsFetcher } from '../composables/use-browse-sections'
import type { SearchFetcher } from '../composables/use-keyword-search'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBrowseListingForTest, useBrowseListing } from '../composables/use-browse-listing'
import BrowseGrid from './browse-grid.vue'

interface FakeObserverRecord {
  callback: (entries: Array<{ isIntersecting: boolean }>) => void
  target: Element | null
}

class FakeIntersectionObserver {
  static instances: FakeObserverRecord[] = []

  callback: (entries: Array<{ isIntersecting: boolean }>) => void
  target: Element | null = null

  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    this.callback = callback
  }

  observe(target: Element): void {
    this.target = target
    FakeIntersectionObserver.instances.push({ callback: this.callback, target })
  }

  disconnect(): void {}

  unobserve(): void {}
}

// Fires only the observer watching the infinite-scroll sentinel: TitleCard
// artwork carries empty aria-hidden hover-card divs that must not match.
function fireSentinel(wrapper: VueWrapper): void {
  const sentinel = wrapper.findAll('div').find(div =>
    div.attributes('aria-hidden') === 'true'
    && div.element.childElementCount === 0
    && !div.classes().includes('hover-card'),
  )?.element
  expect(sentinel).toBeTruthy()
  const record = FakeIntersectionObserver.instances.find(instance => instance.target === sentinel)
  expect(record).toBeTruthy()
  record!.callback([{ isIntersecting: true }])
}

const titles: TitleSummary[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: '沙丘',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: null,
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [28],
  },
  {
    kind: 'MOVIE',
    tmdbId: 693134,
    name: '沙丘：第二部',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-02-27',
    voteAverage: 8.1,
    genreIds: [878],
  },
]

const searchTitles: TitleSummary[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: '沙丘',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: null,
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [28],
  },
  {
    kind: 'TV_SHOW',
    tmdbId: 84773,
    name: '沙丘：預言',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-11-17',
    voteAverage: 7.2,
    genreIds: [878],
  },
]

const genres: Genre[] = [
  { id: 28, name: '動作' },
  { id: 878, name: '科幻' },
]

function page(results: TitleSummary[], totalPages = 1): Page<TitleSummary> {
  return { page: 1, results, totalPages, totalResults: results.length }
}

function horrorRow(): BrowseSection {
  return {
    key: 'movie.horror',
    titleKey: 'browse.sections.movieHorror',
    expandable: true,
    genres: [27],
    minRating: null,
    query: { source: 'discover', genreIds: [27], minVoteCount: 100 },
    titles,
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
    titles,
  }
}

function backdropTitles(): TitleSummary[] {
  return [1, 2, 3, 4, 5, 6].map(id => ({
    kind: 'MOVIE',
    tmdbId: id,
    name: `Backdrop ${id}`,
    posterPath: `/poster-${id}.jpg`,
    backdropPath: `/backdrop-${id}.jpg`,
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [27],
  }))
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
  fakes.fetchSearch.mockResolvedValue(page(searchTitles))
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

beforeEach(() => {
  vi.clearAllMocks()
  FakeIntersectionObserver.instances = []
  vi.unstubAllGlobals()
})

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
  resetBrowseListingForTest()
  vi.unstubAllGlobals()
})

describe('browse-grid', () => {
  it('renders the poster cards from the current page', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('沙丘：第二部')
    // In browse mode without filters the grid becomes server-driven rows with i18n titles (test env resolves en)
    expect(wrapper.text()).toContain('Trending Right Now')
    const links = wrapper.findAll('a').filter(link => link.attributes('href')?.startsWith('/movie/'))
    expect(links.length).toBeGreaterThanOrEqual(2)
    expect(links.map(link => link.attributes('href'))).toEqual(expect.arrayContaining(['/movie/419430', '/movie/693134']))
  })

  it('switches kind and refetches the grid for the other catalog', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    fakes.fetchDiscover.mockClear()

    listing.setKind('TV_SHOW')

    await vi.waitFor(() =>
      expect(fakes.fetchDiscover).toHaveBeenCalledWith('TV_SHOW', expect.objectContaining({ page: 1 })),
    )
    expect(listing.kind.value).toBe('TV_SHOW')
  })

  it('toggles a genre chip and refetches with the selection', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()

    await wrapper.findAll('button').find(button => button.text() === '科幻')!.trigger('click')

    await vi.waitFor(() =>
      expect(fakes.fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ genreIds: [878] })),
    )
    expect(listing.selectedGenreIds.value).toEqual([878])
  })

  it('reveals and invokes clear-all once genres are selected', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    listing.toggleGenre(28)
    await wrapper.vm.$nextTick()

    const clearAll = wrapper.findAll('button').find(button => button.text()?.includes('Clear all'))!
    expect(clearAll).toBeTruthy()

    await clearAll.trigger('click')
    expect(listing.selectedGenreIds.value).toEqual([])
  })

  it('loads the next page when the sentinel becomes visible', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const listing = seedListing()
    fakes.fetchDiscover.mockResolvedValue(page(titles, 2))
    listing.toggleGenre(28)
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    await vi.waitFor(() => expect(listing.loading.value).toBe(false))
    fakes.fetchDiscover.mockClear()

    fireSentinel(wrapper)

    await vi.waitFor(() =>
      expect(fakes.fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ page: 2 })),
    )
  })

  it('hides browse controls while search mode is active', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    await listing.search('dune')
    await wrapper.vm.$nextTick()

    // Home filter bar is gone in search mode; provider/genre chrome doesn't render.
    expect(wrapper.find('.homeFilterBar').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('科幻')
    expect(wrapper.text()).toContain('沙丘：預言')
  })

  it('labels mixed-kind search results with Kind badges', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    await listing.search('dune')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Movie')
    expect(wrapper.text()).toContain('TV Show')
    expect(wrapper.findAll('a')).toHaveLength(2)
  })

  it('renders an intentional no-results state for a query with no matches', async () => {
    const listing = seedListing()
    fakes.fetchSearch.mockResolvedValue(page([]))
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    await listing.search('zzzz')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No results for "zzzz"')
    expect(wrapper.findAll('article')).toHaveLength(0)
  })

  it('restores the browse grid when search mode ends', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    await listing.search('dune')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('沙丘：預言')

    listing.clearSearch()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('沙丘：第二部')
    // home filter bar returns with rating chips
    expect(wrapper.find('.homeFilterBar').exists()).toBe(true)
  })

  it('clears genre filters when a search starts', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    listing.toggleGenre(28)
    expect(listing.selectedGenreIds.value).toEqual([28])

    await listing.search('dune')

    expect(listing.selectedGenreIds.value).toEqual([])
  })

  it('appends search results when the sentinel becomes visible in search mode', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const listing = seedListing()
    fakes.fetchSearch.mockResolvedValue(page(searchTitles, 2))
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    await listing.search('dune')
    await wrapper.vm.$nextTick()

    fireSentinel(wrapper)

    await vi.waitFor(() =>
      expect(fakes.fetchSearch).toHaveBeenCalledWith('dune', 2, 'en'),
    )
    expect(fakes.fetchDiscover).not.toHaveBeenCalledWith('MOVIE', expect.objectContaining({ page: 2 }))
  })

  it('renders the rating chip group with All / 7+ / 8+ options', async () => {
    seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const root = wrapper.element as HTMLElement
    const group = root.querySelector('[aria-label="Minimum rating"]')
    expect(group).toBeTruthy()
    const ratingChips = [...group!.querySelectorAll('button[aria-pressed]')]
    const labels = ratingChips.map(chip => chip.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    expect(labels).toEqual(['All', '★ 7+', '★ 8+'])
  })

  it('applies the 7+ rating filter when its chip is clicked', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()

    const root = wrapper.element as HTMLElement
    const group = root.querySelector('[aria-label="Minimum rating"]')!
    const sevenPlus = [...group.querySelectorAll('button[aria-pressed]')]
      .find(el => el.textContent?.includes('7+')) as HTMLButtonElement | undefined
    expect(sevenPlus).toBeTruthy()
    sevenPlus!.click()

    await vi.waitFor(() =>
      expect(fakes.fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ minRating: 7 })),
    )
  })

  it('clears the rating filter when the active chip is clicked again', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    listing.setMinRating(7)
    await wrapper.vm.$nextTick()

    const root = wrapper.element as HTMLElement
    const group = root.querySelector('[aria-label="Minimum rating"]')!
    const sevenPlus = [...group.querySelectorAll('button[aria-pressed]')]
      .find(el => el.textContent?.includes('7+')) as HTMLButtonElement | undefined
    sevenPlus!.click()

    expect(listing.minRating.value).toBe(null)
  })

  it('shows clear-all once a rating filter is active even without a genre selected', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    listing.setMinRating(7)
    await wrapper.vm.$nextTick()

    const clearAll = wrapper.findAll('button').find(button => button.text()?.includes('Clear all'))
    expect(clearAll).toBeTruthy()
  })

  it('shows loading indicator until filtering results are ready', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    // Hold the next refresh open so the loading overlay has items to cover.
    let release!: (value: Page<TitleSummary>) => void
    fakes.fetchDiscover.mockReturnValueOnce(new Promise<Page<TitleSummary>>(resolve => release = resolve))
    const pending = listing.refresh()
    await wrapper.vm.$nextTick()

    const busyEl = wrapper.element.querySelector('[aria-busy="true"]')
    expect(busyEl).toBeTruthy()

    release(page(titles))
    await pending
  })

  it('keeps the empty state hidden while loading with no items yet', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    let release!: (value: Page<TitleSummary>) => void
    fakes.fetchDiscover.mockReturnValueOnce(new Promise<Page<TitleSummary>>(resolve => release = resolve))
    const pending = listing.refresh()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('No titles found')

    release(page(titles))
    await pending
  })

  it('shows See more on a genre-bound row and replays it with one refresh', async () => {
    const listing = seedListing()
    fakes.fetchSections.mockResolvedValue([horrorRow()])
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    await wrapper.vm.$nextTick()
    fakes.fetchDiscover.mockClear()

    const seeMore = wrapper.findAll('button').find(button => button.text().includes('See more'))
    expect(seeMore).toBeTruthy()
    await seeMore!.trigger('click')

    await vi.waitFor(() =>
      expect(fakes.fetchDiscover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ genreIds: [27], page: 1 })),
    )
    expect(fakes.fetchDiscover).toHaveBeenCalledTimes(1)
    expect(listing.selectedGenreIds.value).toEqual([27])
  })

  it('hides See more on a genre-less row', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Trending Right Now')
    const seeMore = wrapper.findAll('button').find(button => button.text().includes('See more'))
    expect(seeMore).toBeUndefined()
  })

  it('maps the horror row key to expandable cards and other rows to standard cards', async () => {
    const listing = seedListing()
    fakes.fetchSections.mockResolvedValue([{ ...horrorRow(), titles: backdropTitles() }, trendingRow()])
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    await listing.refresh()
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('[data-testid="expandable-title-card"]')).toHaveLength(6)
    const hrefs = wrapper.findAll('a').map(link => link.attributes('href'))
    expect(hrefs).toContain('/movie/419430')
    expect(hrefs).toContain('/movie/693134')
  })
})

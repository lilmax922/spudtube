import type { VueWrapper } from '@vue/test-utils'
import type { Page, TitleSummary } from '#server/tmdb/types'
import type { SearchFetcher } from '../composables/use-keyword-search'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBrowseListingForTest, useBrowseListing } from '../composables/use-browse-listing'
import SearchPage from './search.vue'

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

const searchTitles: TitleSummary[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: '沙丘',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: null,
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
  },
  {
    kind: 'TV_SHOW',
    tmdbId: 84773,
    name: '沙丘：預言',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-11-17',
    voteAverage: 7.2,
  },
]

function page(results: TitleSummary[], totalPages = 1): Page<TitleSummary> {
  return { page: 1, results, totalPages, totalResults: results.length }
}

const fakes = vi.hoisted(() => ({
  fetchSearch: vi.fn(),
  fetchTrending: vi.fn(),
}))

vi.mock('../composables/use-trending', () => ({
  useTrending: () => ({
    movieTitles: { value: [] },
    tvTitles: { value: [] },
    allTitles: { value: [] },
    names: { value: [] },
    loading: { value: false },
    error: { value: false },
    refresh: vi.fn(),
  }),
}))

function seedListing() {
  fakes.fetchSearch.mockResolvedValue(page(searchTitles))
  return useBrowseListing({
    search: { fetchSearch: fakes.fetchSearch } as unknown as SearchFetcher,
  })
}

const mountedWrappers: VueWrapper[] = []

beforeEach(() => {
  vi.clearAllMocks()
  FakeIntersectionObserver.instances = []
  vi.unstubAllGlobals()
  resetBrowseListingForTest()
})

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
  resetBrowseListingForTest()
  vi.unstubAllGlobals()
})

describe('search page', () => {
  it('triggers search when route query q is present', async () => {
    seedListing()
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

    await vi.waitFor(() =>
      expect(fakes.fetchSearch).toHaveBeenCalledWith('dune', 1, 'en'),
    )
  })

  it('clears search when route query is empty', async () => {
    const listing = seedListing()
    const wrapper = await mountSuspended(SearchPage, { route: '/search' })
    mountedWrappers.push(wrapper)

    expect(fakes.fetchSearch).not.toHaveBeenCalled()
    expect(listing.mode.value).toBe('browse')
  })

  it('renders TitleCard grid from search results with Kind badges', async () => {
    seedListing()
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('沙丘：預言'))

    expect(wrapper.text()).toContain('沙丘')
    // TitleCard showKind true => kind badges
    expect(wrapper.findAll('[data-testid="kind-badge"]')).toHaveLength(2)
    const links = wrapper.findAll('a').filter(link => link.attributes('href')?.startsWith('/movie/') || link.attributes('href')?.startsWith('/tv/'))
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('shows loading skeleton when loading with no items', async () => {
    const listing = seedListing()
    let release!: (value: Page<TitleSummary>) => void
    fakes.fetchSearch.mockReturnValueOnce(new Promise<Page<TitleSummary>>(resolve => release = resolve))
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)
    await vi.waitFor(() => expect(listing.loading.value).toBe(true))

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No results')

    release(page(searchTitles))
  })

  it('shows no-results state with query', async () => {
    seedListing()
    fakes.fetchSearch.mockResolvedValue(page([]))
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=zzzz' })
    mountedWrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('No results for "zzzz"'))
  })

  it('shows error state when search fails with no items', async () => {
    seedListing()
    fakes.fetchSearch.mockRejectedValue(new Error('outage'))
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

    await vi.waitFor(() => expect(wrapper.text()).toContain('Something went wrong while searching'))
  })

  it('loads the next page when the sentinel becomes visible', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    seedListing()
    fakes.fetchSearch.mockResolvedValue(page(searchTitles, 2))
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('沙丘：預言'))

    fireSentinel(wrapper)

    await vi.waitFor(() =>
      expect(fakes.fetchSearch).toHaveBeenCalledWith('dune', 2, 'en'),
    )
  })

  it('uses TitleCard grid styling (16/9 aspect) and tabular-nums year', async () => {
    seedListing()
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('沙丘：預言'))

    const grid = wrapper.find('.grid')
    expect(grid.exists()).toBe(true)
    expect(grid.classes().join(' ')).toContain('minmax(240px')
  })

  it('shows related header with query at top and count on the right', async () => {
    seedListing()
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)
    await vi.waitFor(() => expect(wrapper.text()).toContain('沙丘：預言'))

    const header = wrapper.find('[data-testid="search-header"]')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('dune')
    expect(header.text()).not.toContain('TMDB')
    // related without TMDB wording
    expect(header.text()).toContain('results for')
    // count placed to the right of related, not at far edge (gap-3, sibling span)
    const title = header.find('h1')
    const count = header.find('h1 + span')
    expect(title.exists()).toBe(true)
    expect(count.exists()).toBe(true)
    expect(count.text()).toContain('2')
    expect(header.classes().join(' ')).toContain('gap-3')
    expect(header.classes().join(' ')).not.toContain('justify-between')
    expect(header.classes().join(' ')).toContain('items-center')
  })

  it('shows header from route query even before searchedQuery is populated', async () => {
    seedListing()
    let release!: (value: Page<TitleSummary>) => void
    fakes.fetchSearch.mockReturnValueOnce(new Promise<Page<TitleSummary>>(resolve => release = resolve))
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=matrix' })
    mountedWrappers.push(wrapper)

    const header = wrapper.find('[data-testid="search-header"]')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('matrix')

    release(page(searchTitles))
  })
})

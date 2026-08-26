import type { VueWrapper } from '@vue/test-utils'
import type { TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import SearchPage from './search.vue'

interface SearchMockState {
  searchedQuery: { value: string }
  items: { value: TitleSummary[] }
  loading: { value: boolean }
  loadingMore: { value: boolean }
  error: { value: boolean }
}

const mock = vi.hoisted(() => ({
  search: {
    search: vi.fn(),
    loadMore: vi.fn(),
    clear: vi.fn(),
  },
}))

const searchState = {
  searchedQuery: shallowRef(''),
  items: shallowRef<TitleSummary[]>([]),
  loading: shallowRef(false),
  loadingMore: shallowRef(false),
  error: shallowRef(false),
  page: shallowRef(0),
  totalPages: shallowRef(0),
  hasMore: shallowRef(false),
}

vi.mock('../composables/use-search-state', () => ({
  useSearchState: () => ({
    ...searchState,
    search: mock.search.search,
    loadMore: mock.search.loadMore,
    clear: mock.search.clear,
  }),
}))

class FakeIntersectionObserver {
  static instances: Array<{ callback: (entries: Array<{ isIntersecting: boolean }>) => void }> = []

  callback: (entries: Array<{ isIntersecting: boolean }>) => void

  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }

  observe(): void {}

  disconnect(): void {}

  unobserve(): void {}
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

beforeEach(() => {
  const state = searchState as unknown as SearchMockState & { loading: { value: boolean }, loadingMore: { value: boolean }, error: { value: boolean } }
  state.searchedQuery.value = ''
  state.items.value = []
  state.loading.value = false
  state.loadingMore.value = false
  state.error.value = false
  searchState.page.value = 0
  searchState.totalPages.value = 0
  mock.search.search.mockReset()
  mock.search.loadMore.mockReset()
  mock.search.clear.mockReset()
  FakeIntersectionObserver.instances = []
  vi.unstubAllGlobals()
})

const mountedWrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
  vi.unstubAllGlobals()
})

describe('search page', () => {
  it('triggers search when route query q is present', async () => {
    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

    expect(mock.search.search).toHaveBeenCalledWith('dune')
  })

  it('clears search when route query is empty', async () => {
    const wrapper = await mountSuspended(SearchPage, { route: '/search' })
    mountedWrappers.push(wrapper)

    expect(mock.search.clear).toHaveBeenCalled()
  })

  it('renders TitleCard grid from search results with Kind badges', async () => {
    const state = searchState as unknown as SearchMockState
    state.searchedQuery.value = 'dune'
    state.items.value = searchTitles

    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('沙丘：預言')
    // TitleCard showKind true => kind badges
    expect(wrapper.findAll('[data-testid="kind-badge"]')).toHaveLength(2)
    const links = wrapper.findAll('a').filter(link => link.attributes('href')?.startsWith('/movie/') || link.attributes('href')?.startsWith('/tv/'))
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  it('shows loading skeleton when loading with no items', async () => {
    const state = searchState as unknown as SearchMockState
    state.loading.value = true
    state.items.value = []

    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No results')
  })

  it('shows no-results state with query', async () => {
    const state = searchState as unknown as SearchMockState
    state.searchedQuery.value = 'zzzz'
    state.items.value = []

    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=zzzz' })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('No results for "zzzz"')
  })

  it('shows error state when search fails with no items', async () => {
    const state = searchState as unknown as SearchMockState
    state.error.value = true
    state.items.value = []

    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Something went wrong while searching')
  })

  it('loads the next page when the sentinel becomes visible', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const state = searchState as unknown as SearchMockState
    state.searchedQuery.value = 'dune'
    state.items.value = searchTitles

    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

    const observer = FakeIntersectionObserver.instances[0]
    expect(observer).toBeDefined()
    observer!.callback([{ isIntersecting: true }])

    expect(mock.search.loadMore).toHaveBeenCalledTimes(1)
  })

  it('uses TitleCard grid styling (16/9 aspect) and tabular-nums year', async () => {
    const state = searchState as unknown as SearchMockState
    state.searchedQuery.value = 'dune'
    state.items.value = searchTitles

    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

    const grid = wrapper.find('.grid')
    expect(grid.exists()).toBe(true)
    expect(grid.classes().join(' ')).toContain('minmax(240px')
  })

  it('shows related header with query at top and count on the right', async () => {
    const state = searchState as unknown as SearchMockState
    state.searchedQuery.value = 'dune'
    state.items.value = searchTitles

    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=dune' })
    mountedWrappers.push(wrapper)

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
    const state = searchState as unknown as SearchMockState
    state.searchedQuery.value = ''
    state.items.value = []

    const wrapper = await mountSuspended(SearchPage, { route: '/search?q=matrix' })
    mountedWrappers.push(wrapper)

    const header = wrapper.find('[data-testid="search-header"]')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('matrix')
  })
})

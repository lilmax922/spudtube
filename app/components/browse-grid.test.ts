import type { VueWrapper } from '@vue/test-utils'
import type { Genre, TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import BrowseGrid from './browse-grid.vue'

interface MockState {
  kind: { value: 'MOVIE' | 'TV_SHOW' }
  selectedGenreIds: { value: number[] }
  genres: { value: Genre[] }
  items: { value: TitleSummary[] }
  loading: { value: boolean }
  loadingMore: { value: boolean }
  error: { value: boolean }
}

interface SearchMockState {
  mode: { value: 'browse' | 'search' }
  searchedQuery: { value: string }
  items: { value: TitleSummary[] }
  loading: { value: boolean }
  loadingMore: { value: boolean }
  error: { value: boolean }
}

const mock = vi.hoisted(() => ({
  browse: {
    refresh: vi.fn(),
    loadMore: vi.fn(),
    setKind: vi.fn(),
    toggleGenre: vi.fn(),
    clearGenres: vi.fn(),
  },
  search: {
    loadMore: vi.fn(),
  },
}))

// Refs are created here (not hoisted) so they are real Vue refs; the vi.mock factories
// below run lazily on first import, by which time this state is initialized.
const browseState = {
  kind: shallowRef<'MOVIE' | 'TV_SHOW'>('MOVIE'),
  selectedGenreIds: shallowRef<number[]>([]),
  genres: shallowRef<Genre[]>([]),
  items: shallowRef<TitleSummary[]>([]),
  loading: shallowRef(false),
  loadingMore: shallowRef(false),
  error: shallowRef(false),
}

const searchState = {
  mode: shallowRef<'browse' | 'search'>('browse'),
  searchedQuery: shallowRef(''),
  items: shallowRef<TitleSummary[]>([]),
  loading: shallowRef(false),
  loadingMore: shallowRef(false),
  error: shallowRef(false),
}

vi.mock('../composables/use-browse-grid', () => ({
  useBrowseGrid: () => ({
    ...browseState,
    refresh: mock.browse.refresh,
    loadMore: mock.browse.loadMore,
    setKind: mock.browse.setKind,
    toggleGenre: mock.browse.toggleGenre,
    clearGenres: mock.browse.clearGenres,
  }),
}))

vi.mock('../composables/use-search-state', () => ({
  useSearchState: () => ({
    ...searchState,
    loadMore: mock.search.loadMore,
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

const titles: TitleSummary[] = [
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
    kind: 'MOVIE',
    tmdbId: 693134,
    name: '沙丘：第二部',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2024-02-27',
    voteAverage: 8.1,
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

const genres: Genre[] = [
  { id: 28, name: '動作' },
  { id: 878, name: '科幻' },
]

beforeEach(() => {
  const state = browseState as unknown as MockState
  state.kind.value = 'MOVIE'
  state.selectedGenreIds.value = []
  state.genres.value = genres
  state.items.value = titles
  state.loading.value = false
  state.loadingMore.value = false
  state.error.value = false

  const searchMock = searchState as unknown as SearchMockState
  searchMock.mode.value = 'browse'
  searchMock.searchedQuery.value = ''
  searchMock.items.value = []
  searchMock.loading.value = false
  searchMock.loadingMore.value = false
  searchMock.error.value = false
})

const mountedWrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
  mock.browse.refresh.mockReset()
  mock.browse.loadMore.mockReset()
  mock.browse.setKind.mockReset()
  mock.browse.toggleGenre.mockReset()
  mock.browse.clearGenres.mockReset()
  mock.search.loadMore.mockReset()
  FakeIntersectionObserver.instances = []
  vi.unstubAllGlobals()
})

describe('browse-grid', () => {
  it('renders the poster cards from the current page', async () => {
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('沙丘：第二部')
    const links = wrapper.findAll('a').filter(link => link.attributes('href')?.startsWith('/movie/'))
    expect(links).toHaveLength(2)
    expect(links.map(link => link.attributes('href'))).toEqual(['/movie/419430', '/movie/693134'])
  })

  it('no longer renders kind toggle inside grid (moved to header primeNav)', async () => {
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).not.toContain('TV Shows')
    expect(wrapper.text()).not.toContain('Movies')
    // kind switching is now via header primeNav, not BrowseGrid
    expect(mock.browse.setKind).not.toHaveBeenCalled()
  })

  it('no longer renders genre chips inside grid (moved to FilterBar)', async () => {
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).not.toContain('科幻')
    expect(wrapper.text()).not.toContain('動作')
    expect(mock.browse.toggleGenre).not.toHaveBeenCalled()
  })

  it('does not render Clear all inside grid (moved to FilterBar)', async () => {
    const state = browseState as unknown as MockState
    state.selectedGenreIds.value = [28]

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const clearAll = wrapper.findAll('button').find(button => button.text() === 'Clear all')
    expect(clearAll).toBeUndefined()
  })

  it('loads the next page when the sentinel becomes visible', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const observer = FakeIntersectionObserver.instances[0]!
    observer.callback([{ isIntersecting: true }])

    expect(mock.browse.loadMore).toHaveBeenCalledTimes(1)
  })

  it('hides browse controls while search mode is active', async () => {
    const state = searchState as unknown as SearchMockState
    state.mode.value = 'search'
    state.searchedQuery.value = 'dune'
    state.items.value = searchTitles

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).not.toContain('TV Shows')
    expect(wrapper.text()).not.toContain('科幻')
    expect(wrapper.text()).toContain('沙丘：預言')
  })

  it('labels mixed-kind search results with Kind badges', async () => {
    const state = searchState as unknown as SearchMockState
    state.mode.value = 'search'
    state.searchedQuery.value = 'dune'
    state.items.value = searchTitles

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Movie')
    expect(wrapper.text()).toContain('TV Show')
    expect(wrapper.findAll('a')).toHaveLength(2)
  })

  it('renders an intentional no-results state for a query with no matches', async () => {
    const state = searchState as unknown as SearchMockState
    state.mode.value = 'search'
    state.searchedQuery.value = 'zzzz'
    state.items.value = []

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('No results for "zzzz"')
    expect(wrapper.findAll('article')).toHaveLength(0)
  })

  it('restores the browse grid when search mode ends', async () => {
    const state = searchState as unknown as SearchMockState
    state.mode.value = 'search'
    state.searchedQuery.value = 'dune'
    state.items.value = searchTitles

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    expect(wrapper.text()).toContain('沙丘：預言')

    state.mode.value = 'browse'
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('沙丘：第二部')
    // kind toggle moved to header, grid no longer contains TV Shows text
    expect(wrapper.text()).not.toContain('TV Shows')
  })

  it('clears genre filters when a search starts', async () => {
    const state = searchState as unknown as SearchMockState
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    expect(mock.browse.clearGenres).not.toHaveBeenCalled()

    state.searchedQuery.value = 'dune'
    await wrapper.vm.$nextTick()

    expect(mock.browse.clearGenres).toHaveBeenCalledTimes(1)
  })

  it('appends search results when the sentinel becomes visible in search mode', async () => {
    const state = searchState as unknown as SearchMockState
    state.mode.value = 'search'
    state.searchedQuery.value = 'dune'
    state.items.value = searchTitles
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const observer = FakeIntersectionObserver.instances[0]!
    observer.callback([{ isIntersecting: true }])

    expect(mock.search.loadMore).toHaveBeenCalledTimes(1)
    expect(mock.browse.loadMore).not.toHaveBeenCalled()
  })
})

import type { Genre, TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  query: { value: string }
  searchedQuery: { value: string }
  items: { value: TitleSummary[] }
  loading: { value: boolean }
  loadingMore: { value: boolean }
  error: { value: boolean }
}

const mock = vi.hoisted(() => {
  function ref<T>(value: T): { value: T, __v_isRef: true } {
    return { value, __v_isRef: true }
  }
  const browse = {
    state: {
      kind: ref('MOVIE'),
      selectedGenreIds: ref([]),
      genres: ref([]),
      items: ref([]),
      loading: ref(false),
      loadingMore: ref(false),
      error: ref(false),
    },
    refresh: vi.fn(),
    loadMore: vi.fn(),
    setKind: vi.fn(),
    toggleGenre: vi.fn(),
    clearGenres: vi.fn(),
  }
  const search = {
    state: {
      query: ref(''),
      searchedQuery: ref(''),
      items: ref([]),
      loading: ref(false),
      loadingMore: ref(false),
      error: ref(false),
    },
    search: vi.fn(),
    loadMore: vi.fn(),
    clear: vi.fn(),
  }
  return { browse, search }
})

vi.mock('../composables/use-browse-grid', () => ({
  useBrowseGrid: () => ({
    ...mock.browse.state,
    refresh: mock.browse.refresh,
    loadMore: mock.browse.loadMore,
    setKind: mock.browse.setKind,
    toggleGenre: mock.browse.toggleGenre,
    clearGenres: mock.browse.clearGenres,
  }),
}))

vi.mock('../composables/use-keyword-search', () => ({
  useKeywordSearch: () => ({
    ...mock.search.state,
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
  const state = mock.browse.state as MockState
  state.kind.value = 'MOVIE'
  state.selectedGenreIds.value = []
  state.genres.value = genres
  state.items.value = titles
  state.loading.value = false
  state.loadingMore.value = false
  state.error.value = false

  const searchState = mock.search.state as SearchMockState
  searchState.query.value = ''
  searchState.searchedQuery.value = ''
  searchState.items.value = []
  searchState.loading.value = false
  searchState.loadingMore.value = false
  searchState.error.value = false
})

afterEach(() => {
  mock.browse.refresh.mockReset()
  mock.browse.loadMore.mockReset()
  mock.browse.setKind.mockReset()
  mock.browse.toggleGenre.mockReset()
  mock.browse.clearGenres.mockReset()
  mock.search.search.mockReset()
  mock.search.loadMore.mockReset()
  mock.search.clear.mockReset()
  FakeIntersectionObserver.instances = []
  vi.unstubAllGlobals()
})

describe('browse-grid', () => {
  it('renders the poster cards from the current page', async () => {
    const wrapper = await mountSuspended(BrowseGrid)

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('沙丘：第二部')
    expect(wrapper.findAll('article')).toHaveLength(2)
  })

  it('switches kind and refetches the grid for the other catalog', async () => {
    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.findAll('button').find(button => button.text() === 'TV Shows')!.trigger('click')

    expect(mock.browse.setKind).toHaveBeenCalledWith('TV_SHOW')
  })

  it('toggles a genre chip and applies the selection', async () => {
    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.findAll('button').find(button => button.text() === '科幻')!.trigger('click')

    expect(mock.browse.toggleGenre).toHaveBeenCalledWith(878)
  })

  it('reveals and invokes clear-all once genres are selected', async () => {
    const state = mock.browse.state as MockState
    state.selectedGenreIds.value = [28]

    const wrapper = await mountSuspended(BrowseGrid)

    const clearAll = wrapper.findAll('button').find(button => button.text() === 'Clear all')!
    expect(clearAll).toBeTruthy()

    await clearAll.trigger('click')

    expect(mock.browse.clearGenres).toHaveBeenCalled()
  })

  it('loads the next page when the sentinel becomes visible', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

    await mountSuspended(BrowseGrid)

    const observer = FakeIntersectionObserver.instances[0]!
    observer.callback([{ isIntersecting: true }])

    expect(mock.browse.loadMore).toHaveBeenCalledTimes(1)
  })

  it('searches both kinds when a query is submitted and hides browse controls', async () => {
    const wrapper = await mountSuspended(BrowseGrid)
    const input = wrapper.find('input[type="search"]')

    await input.setValue('dune')
    await wrapper.find('form').trigger('submit')

    expect(mock.search.search).toHaveBeenCalledWith('dune')
    expect(mock.browse.clearGenres).toHaveBeenCalled()

    expect(wrapper.find('button').text()).not.toContain('TV Shows')
    expect(wrapper.text()).not.toContain('科幻')
  })

  it('does not enter search mode for an empty query', async () => {
    const wrapper = await mountSuspended(BrowseGrid)
    const input = wrapper.find('input[type="search"]')

    await input.setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(mock.search.search).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('TV Shows')
  })

  it('labels mixed-kind search results and shows them in place of browse cards', async () => {
    const state = mock.search.state as SearchMockState
    state.items.value = searchTitles

    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.find('input[type="search"]').setValue('dune')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('沙丘：預言')
    expect(wrapper.text()).toContain('Movie')
    expect(wrapper.text()).toContain('TV Show')
    expect(wrapper.text()).not.toContain('沙丘：第二部')
  })

  it('renders an intentional no-results state for a query with no matches', async () => {
    const state = mock.search.state as SearchMockState
    state.searchedQuery.value = 'zzzz'
    state.items.value = []

    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.find('input[type="search"]').setValue('zzzz')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('No results for "zzzz"')
    expect(wrapper.findAll('article')).toHaveLength(0)
  })

  it('returns to the browse mode when the search is cleared', async () => {
    const state = mock.search.state as SearchMockState
    state.items.value = searchTitles

    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.find('input[type="search"]').setValue('dune')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('沙丘：預言')

    await wrapper.find('button[aria-label="Clear search"]').trigger('click')

    expect(mock.search.clear).toHaveBeenCalled()
    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('TV Shows')
  })

  it('leaves search mode by submitting an empty query', async () => {
    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.find('input[type="search"]').setValue('dune')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).not.toContain('TV Shows')

    await wrapper.find('input[type="search"]').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(mock.search.clear).toHaveBeenCalled()
    expect(wrapper.text()).toContain('TV Shows')
  })

  it('keeps the clear button in search mode even with an empty input', async () => {
    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.find('input[type="search"]').setValue('dune')
    await wrapper.find('form').trigger('submit')

    await wrapper.find('input[type="search"]').setValue('')

    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(true)
  })

  it('appends search results when the sentinel becomes visible in search mode', async () => {
    const state = mock.search.state as SearchMockState
    state.items.value = searchTitles
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.find('input[type="search"]').setValue('dune')
    await wrapper.find('form').trigger('submit')

    const observer = FakeIntersectionObserver.instances[0]!
    observer.callback([{ isIntersecting: true }])

    expect(mock.search.loadMore).toHaveBeenCalledTimes(1)
    expect(mock.browse.loadMore).not.toHaveBeenCalled()
  })
})

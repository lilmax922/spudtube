import type { VueWrapper } from '@vue/test-utils'
import type { TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, shallowRef } from 'vue'
import SearchPage from './search.vue'

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

vi.mock('../composables/use-browse-listing', () => ({
  useBrowseListing: () => ({
    ...searchState,
    mode: shallowRef('browse' as const),
    rows: shallowRef([]),
    popularProviders: shallowRef([]),
    providerSearchResults: shallowRef([]),
    providerSearchQuery: shallowRef(''),
    providerSearchLoading: shallowRef(false),
    selectedGenreIds: shallowRef<number[]>([]),
    minRating: shallowRef<number | null>(null),
    selectedProviderIds: shallowRef<number[]>([]),
    availableProviders: shallowRef([]),
    genres: shallowRef([]),
    refresh: mock.search.search,
    loadMore: mock.search.loadMore,
    applySection: mock.search.search,
    setKind: mock.search.search,
    toggleGenre: mock.search.search,
    clearGenres: mock.search.clear,
    setMinRating: mock.search.search,
    toggleProvider: mock.search.search,
    clearProviders: mock.search.clear,
    clearFilters: mock.search.clear,
    search: mock.search.search,
    clearSearch: mock.search.clear,
    searchProviders: mock.search.search,
    clearProviderSearch: mock.search.clear,
  }),
}))

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

const movieTitles = [
  title('MOVIE', 1, '電影一'),
  title('MOVIE', 2, '電影二'),
]
const tvTitles = [
  title('TV_SHOW', 11, '影集一'),
  title('TV_SHOW', 12, '影集二'),
]

vi.mock('../composables/use-trending', () => ({
  useTrending: () => ({
    movieTitles: shallowRef(movieTitles),
    tvTitles: shallowRef(tvTitles),
    allTitles: computed(() => [movieTitles[0]!, tvTitles[0]!, movieTitles[1]!, tvTitles[1]!]),
    names: shallowRef<string[]>([]),
    loading: shallowRef(false),
    error: shallowRef(false),
    refresh: vi.fn(),
  }),
}))

const mountedWrappers: VueWrapper[] = []

beforeEach(() => {
  searchState.searchedQuery.value = ''
  searchState.items.value = []
  searchState.loading.value = false
  searchState.loadingMore.value = false
  searchState.error.value = false
  mock.search.search.mockReset()
  mock.search.loadMore.mockReset()
  mock.search.clear.mockReset()
})

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
})

describe('search page default landing', () => {
  it('shows landing sections instead of the empty no-results message', async () => {
    const wrapper = await mountSuspended(SearchPage, { route: '/search' })
    mountedWrappers.push(wrapper)

    const landing = wrapper.find('[data-testid="search-default"]')
    expect(landing.exists()).toBe(true)
    expect(wrapper.text()).not.toContain('沒有與')
    expect(wrapper.find('[data-testid="search-header"]').exists()).toBe(false)
  })

  it('shows recommended grid with tabs and no recent or trending sections', async () => {
    const wrapper = await mountSuspended(SearchPage, { route: '/search' })
    mountedWrappers.push(wrapper)

    const text = wrapper.text()
    expect(text).toContain('Recommended for you')
    expect(text).not.toContain('Trending Searches')
    expect(text).not.toContain('Recent Searches')
    expect(text).toContain('電影一')
    expect(text).toContain('影集一')
    expect(text).toContain('All')
    expect(text).toContain('Movies')
    expect(text).toContain('TV Shows')
  })

  it('shows interleaved all titles on the default tab', async () => {
    const wrapper = await mountSuspended(SearchPage, { route: '/search' })
    mountedWrappers.push(wrapper)

    const landing = wrapper.find('[data-testid="search-default"]')
    const cards = landing.findAll('[data-testid="kind-badge"]')
    expect(cards).toHaveLength(4)
  })
})

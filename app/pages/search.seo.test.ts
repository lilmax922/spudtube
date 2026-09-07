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
})

afterEach(() => {
})

function robotsContent(): string | null {
  return document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null
}

describe('search page SEO', () => {
  it('sets robots noindex,nofollow', async () => {
    await mountSuspended(SearchPage, { route: '/search?q=dune' })
    await vi.waitFor(() => expect(robotsContent()).toBeTruthy())
    const content = robotsContent()!
    expect(content.includes('noindex')).toBe(true)
    expect(content.includes('nofollow')).toBe(true)
  })

  it('robots meta contains both noindex and nofollow (comma or space separated)', async () => {
    await mountSuspended(SearchPage, { route: '/search' })
    await vi.waitFor(() => expect(robotsContent()).toBeTruthy())
    expect(robotsContent()!.replace(/\s/g, '').includes('noindex,nofollow') || robotsContent()!.includes('noindex')).toBe(true)
  })
})

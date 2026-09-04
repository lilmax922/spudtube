import type { VueWrapper } from '@vue/test-utils'
import type { Genre, TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import BrowseGrid from './browse-grid.vue'

interface MockState {
  kind: { value: 'MOVIE' | 'TV_SHOW' }
  selectedGenreIds: { value: number[] }
  minRating: { value: number | null }
  selectedProviderIds: { value: number[] }
  availableProviders: { value: { id: number, name: string, logoPath: string | null }[] }
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
    setMinRating: vi.fn(),
    toggleProvider: vi.fn(),
    clearProviders: vi.fn(),
    clearFilters: vi.fn(),
  },
  search: {
    loadMore: vi.fn(),
  },
  sections: {
    refresh: vi.fn(),
  },
}))

const browseState = {
  kind: shallowRef<'MOVIE' | 'TV_SHOW'>('MOVIE'),
  selectedGenreIds: shallowRef<number[]>([]),
  minRating: shallowRef<number | null>(null),
  selectedProviderIds: shallowRef<number[]>([]),
  availableProviders: shallowRef<{ id: number, name: string, logoPath: string | null }[]>([]),
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
    setMinRating: mock.browse.setMinRating,
    toggleProvider: mock.browse.toggleProvider,
    clearProviders: mock.browse.clearProviders,
    clearFilters: mock.browse.clearFilters,
  }),
}))

vi.mock('../composables/use-search-state', () => ({
  useSearchState: () => ({
    ...searchState,
    loadMore: mock.search.loadMore,
  }),
}))

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

interface SectionsMockState {
  sections: { value: { key: string, titleKey: string, genres: number[], minRating: number | null, titles: TitleSummary[] }[] }
  loading: { value: boolean }
  error: { value: boolean }
}

const sectionsState = {
  sections: shallowRef<SectionsMockState['sections']['value']>([]),
  loading: shallowRef(false),
  error: shallowRef(false),
}

vi.mock('../composables/use-browse-sections', () => ({
  useBrowseSections: () => ({
    ...sectionsState,
    refresh: mock.sections.refresh,
  }),
}))

const mountedWrappers: VueWrapper[] = []

beforeEach(() => {
  const state = browseState as unknown as MockState
  state.kind.value = 'MOVIE'
  state.selectedGenreIds.value = []
  state.minRating.value = null
  state.selectedProviderIds.value = []
  state.availableProviders.value = []
  state.genres.value = genres
  state.items.value = []
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

  const sectionsMock = sectionsState as unknown as SectionsMockState
  sectionsMock.sections.value = [
    { key: 'movie.trending', titleKey: 'browse.sections.movieTrending', genres: [], minRating: null, titles },
  ]
  sectionsMock.loading.value = false
  sectionsMock.error.value = false
})

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
  mock.browse.refresh.mockReset()
  mock.browse.loadMore.mockReset()
  mock.browse.setKind.mockReset()
  mock.browse.toggleGenre.mockReset()
  mock.browse.clearGenres.mockReset()
  mock.browse.setMinRating.mockReset()
  mock.browse.toggleProvider.mockReset()
  mock.browse.clearProviders.mockReset()
  mock.browse.clearFilters.mockReset()
  mock.search.loadMore.mockReset()
  mock.sections.refresh.mockReset()
  vi.unstubAllGlobals()
})

describe('browse-grid flash regression: should always show carousel when unfiltered', () => {
  it('initial loading with no filters must show carousel rows, not grid skeleton', async () => {
    const state = browseState as unknown as MockState
    state.loading.value = true
    state.items.value = []
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const html = wrapper.html()
    const root = wrapper.element as HTMLElement
    const rowsContainer = root.querySelector('.rows')
    const hasGridClasses = html.includes('grid-cols-[repeat(auto-fill')
    const hasRows = rowsContainer !== null
    const hasCarousel = root.querySelector('[role="region"]') !== null || hasRows

    expect(hasRows || hasCarousel, 'expected carousel rows while unfiltered loading, but got grid').toBe(true)
    expect(hasGridClasses, 'unfiltered loading should not render grid skeleton').toBe(false)
  })

  it('with data and no filters must show rows (carousel), not grid', async () => {
    const state = browseState as unknown as MockState
    state.loading.value = false
    state.items.value = titles
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const root = wrapper.element as HTMLElement
    const rowsContainer = root.querySelector('.rows')
    expect(rowsContainer, 'expected rows container when unfiltered with data').toBeTruthy()
  })

  it('with genre filter active must show grid, not carousel', async () => {
    const state = browseState as unknown as MockState
    state.loading.value = false
    state.items.value = titles
    state.selectedGenreIds.value = [28]
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const root = wrapper.element as HTMLElement
    const rowsContainer = root.querySelector('.rows')
    expect(rowsContainer, 'should not have rows when filtered by genre').toBeNull()
    // Should have grid
    expect(root.innerHTML.includes('grid-cols')).toBe(true)
  })

  it('with minRating filter active must show grid, not carousel', async () => {
    const state = browseState as unknown as MockState
    state.loading.value = false
    state.items.value = titles
    state.minRating.value = 7
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const root = wrapper.element as HTMLElement
    const rowsContainer = root.querySelector('.rows')
    expect(rowsContainer, 'should not have rows when filtered by minRating').toBeNull()
  })

  it('loading with data already present and no filter should stay in rows mode, not flip to grid', async () => {
    const state = browseState as unknown as MockState
    state.loading.value = true
    state.items.value = titles
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const root = wrapper.element as HTMLElement
    const rowsContainer = root.querySelector('.rows')
    expect(rowsContainer, 'warm reload with no filter should stay in rows mode').toBeTruthy()
  })
})

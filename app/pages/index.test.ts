import type { VueWrapper } from '@vue/test-utils'
import type { Genre, TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import IndexPage from './index.vue'

interface BrowseMockState {
  kind: { value: 'MOVIE' | 'TV_SHOW' }
  selectedGenreIds: { value: number[] }
  minRating: { value: number | null }
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

const heroState = {
  titles: shallowRef<TitleSummary[]>([]),
  loading: shallowRef(false),
  error: shallowRef(false),
}

const mock = vi.hoisted(() => ({
  browse: {
    refresh: vi.fn(),
    loadMore: vi.fn(),
    setKind: vi.fn(),
    toggleGenre: vi.fn(),
    clearGenres: vi.fn(),
    setMinRating: vi.fn(),
  },
  search: {
    loadMore: vi.fn(),
  },
}))

const browseState: BrowseMockState = {
  kind: shallowRef('MOVIE'),
  selectedGenreIds: shallowRef([]),
  minRating: shallowRef<number | null>(null),
  genres: shallowRef([]),
  items: shallowRef([]),
  loading: shallowRef(false),
  loadingMore: shallowRef(false),
  error: shallowRef(false),
}

const searchState: SearchMockState = {
  mode: shallowRef('browse'),
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
  }),
}))

vi.mock('../composables/use-hero-titles', () => ({
  useHeroTitles: () => heroState,
}))

vi.mock('../composables/use-search-state', () => ({
  useSearchState: () => ({
    ...searchState,
    loadMore: mock.search.loadMore,
  }),
}))

const heroTitles: TitleSummary[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: 'Dune',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: '/iopYFB1b6Bh7FWZhjzonDEfMvZB.jpg',
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [878],
  },
  {
    kind: 'MOVIE',
    tmdbId: 693134,
    name: 'Dune Part Two',
    posterPath: null,
    backdropPath: '/87FQUboshqcztBkz5wXRPlbMmyM.jpg',
    releaseDate: '2024-02-27',
    voteAverage: 8.3,
    genreIds: [878],
  },
]

const browseTitles: TitleSummary[] = [
  {
    kind: 'MOVIE',
    tmdbId: 419430,
    name: 'Dune',
    posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
    backdropPath: '/iopYFB1b6Bh7FWZhjzonDEfMvZB.jpg',
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    genreIds: [878],
  },
  {
    kind: 'MOVIE',
    tmdbId: 693134,
    name: 'Dune Part Two',
    posterPath: null,
    backdropPath: '/87FQUboshqcztBkz5wXRPlbMmyM.jpg',
    releaseDate: '2024-02-27',
    voteAverage: 8.3,
    genreIds: [878],
  },
]

const mountedWrappers: VueWrapper[] = []

beforeEach(() => {
  browseState.kind.value = 'MOVIE'
  browseState.selectedGenreIds.value = []
  browseState.minRating.value = null
  browseState.genres.value = []
  browseState.items.value = []
  browseState.loading.value = false
  browseState.loadingMore.value = false
  browseState.error.value = false

  searchState.mode.value = 'browse'
  searchState.searchedQuery.value = ''
  searchState.items.value = []
  searchState.loading.value = false
  searchState.loadingMore.value = false
  searchState.error.value = false

  heroState.titles.value = []
  heroState.loading.value = false
  heroState.error.value = false

  mock.browse.refresh.mockReset()
  mock.browse.loadMore.mockReset()
  mock.browse.setKind.mockReset()
  mock.browse.toggleGenre.mockReset()
  mock.browse.clearGenres.mockReset()
  mock.search.loadMore.mockReset()
})

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0))
    wrapper.unmount()
})

describe('home page', () => {
  it('renders the browse grid', async () => {
    browseState.items.value = browseTitles
    browseState.genres.value = [{ id: 878, name: 'Sci-Fi' }]

    const wrapper = await mountSuspended(IndexPage)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Dune')
    expect(wrapper.text()).toContain('Dune Part Two')
  })

  it('renders a hero carousel above the grid when trending titles are available', async () => {
    heroState.titles.value = heroTitles

    const wrapper = await mountSuspended(IndexPage)
    mountedWrappers.push(wrapper)

    const root = wrapper.element as HTMLElement
    const carousel = root.querySelector('[aria-roledescription="carousel"]')
    expect(carousel).toBeTruthy()

    // The carousel must precede the grid in document order
    expect(root.firstElementChild?.contains(carousel!)).toBe(true)
  })

  it('does not render the hero when there are no trending titles yet', async () => {
    heroState.titles.value = []
    heroState.loading.value = true

    const wrapper = await mountSuspended(IndexPage)
    mountedWrappers.push(wrapper)

    const carousel = (wrapper.element as HTMLElement).querySelector('[aria-roledescription="carousel"]')
    expect(carousel).toBeNull()
  })

  it('does not let filter changes mutate the hero carousel', async () => {
    heroState.titles.value = heroTitles
    browseState.items.value = browseTitles

    const wrapper = await mountSuspended(IndexPage)
    mountedWrappers.push(wrapper)

    // Simulate the user applying a filter that shrinks the browse grid to a single title;
    // the hero should remain untouched (it reads from its own dataset).
    browseState.items.value = [browseTitles[0]!]
    await wrapper.vm.$nextTick()

    const slides = (wrapper.element as HTMLElement).querySelectorAll('[data-index]')
    expect(slides.length).toBe(heroTitles.length)
  })

  it('still renders the grid while the initial browse is loading', async () => {
    browseState.loading.value = true
    browseState.items.value = []

    const wrapper = await mountSuspended(IndexPage)
    mountedWrappers.push(wrapper)

    // Unfiltered browse renders rows skeleton while loading, not grid.
    const root = wrapper.element as HTMLElement
    expect(root.querySelectorAll('.aspect-\\[2\\/3\\]').length).toBeGreaterThan(0)
    expect(root.querySelector('.rows')).toBeTruthy()
  })
})

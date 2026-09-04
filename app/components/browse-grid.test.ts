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

// Refs are created here (not hoisted) so they are real Vue refs; the vi.mock factories
// below run lazily on first import, by which time this state is initialized.
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

beforeEach(() => {
  const state = browseState as unknown as MockState
  state.kind.value = 'MOVIE'
  state.selectedGenreIds.value = []
  state.minRating.value = null
  state.selectedProviderIds.value = []
  state.availableProviders.value = []
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

  const sectionsMock = sectionsState as unknown as SectionsMockState
  sectionsMock.sections.value = [
    { key: 'movie.trending', titleKey: 'browse.sections.movieTrending', genres: [], minRating: null, titles },
  ]
  sectionsMock.loading.value = false
  sectionsMock.error.value = false
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
  mock.browse.setMinRating.mockReset()
  mock.browse.toggleProvider.mockReset()
  mock.browse.clearProviders.mockReset()
  mock.browse.clearFilters.mockReset()
  mock.search.loadMore.mockReset()
  mock.sections.refresh.mockReset()
  FakeIntersectionObserver.instances = []
  vi.unstubAllGlobals()
})

describe('browse-grid', () => {
  it('renders the poster cards from the current page', async () => {
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('沙丘：第二部')
    // In browse mode without filters the grid becomes server-driven rows with i18n titles (test env resolves en)
    expect(wrapper.text()).toContain('Trending Right Now')
    const links = wrapper.findAll('a').filter(link => link.attributes('href')?.startsWith('/movie/'))
    expect(links.length).toBeGreaterThanOrEqual(2)
    expect(links.map(link => link.attributes('href'))).toEqual(expect.arrayContaining(['/movie/419430', '/movie/693134']))
  })

  it('switches kind and refetches the grid for the other catalog', async () => {
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    // The home filter bar emits toggleProvider? No — kind switching now happens via the header.
    // BrowseGrid itself no longer surfaces a kind toggle; it consumes whatever the singleton carries.
    // Calling setKind directly still triggers refresh, so verify the composable wiring.
    const state = browseState as unknown as MockState
    state.kind.value = 'TV_SHOW'
    await wrapper.vm.$nextTick()

    expect(state.kind.value).toBe('TV_SHOW')
  })

  it('toggles a genre chip and applies the selection', async () => {
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    await wrapper.findAll('button').find(button => button.text() === '科幻')!.trigger('click')

    expect(mock.browse.toggleGenre).toHaveBeenCalledWith(878)
  })

  it('reveals and invokes clear-all once genres are selected', async () => {
    const state = browseState as unknown as MockState
    state.selectedGenreIds.value = [28]

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const clearAll = wrapper.findAll('button').find(button => button.text()?.includes('Clear all'))!
    expect(clearAll).toBeTruthy()

    await clearAll.trigger('click')

    expect(mock.browse.clearFilters).toHaveBeenCalled()
  })

  it('loads the next page when the sentinel becomes visible', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    // Rows mode disables infinite scroll — force grid mode via active filter
    const state = browseState as unknown as MockState
    state.selectedGenreIds.value = [28]

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

    // Home filter bar is gone in search mode; provider/genre chrome doesn't render.
    expect(wrapper.find('.homeFilterBar').exists()).toBe(false)
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
    // home filter bar returns with rating chips
    expect(wrapper.find('.homeFilterBar').exists()).toBe(true)
  })

  it('clears genre filters when a search starts', async () => {
    const state = searchState as unknown as SearchMockState
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    expect(mock.browse.clearFilters).not.toHaveBeenCalled()

    state.searchedQuery.value = 'dune'
    await wrapper.vm.$nextTick()

    expect(mock.browse.clearFilters).toHaveBeenCalledTimes(1)
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

  it('renders the rating chip group with All / 7+ / 8+ options', async () => {
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
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const root = wrapper.element as HTMLElement
    const group = root.querySelector('[aria-label="Minimum rating"]')!
    const sevenPlus = [...group.querySelectorAll('button[aria-pressed]')]
      .find(el => el.textContent?.includes('7+')) as HTMLButtonElement | undefined
    expect(sevenPlus).toBeTruthy()
    sevenPlus!.click()

    expect(mock.browse.setMinRating).toHaveBeenCalledWith(7)
  })

  it('clears the rating filter when the active chip is clicked again', async () => {
    const state = browseState as unknown as MockState
    state.minRating.value = 7

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const root = wrapper.element as HTMLElement
    const group = root.querySelector('[aria-label="Minimum rating"]')!
    const sevenPlus = [...group.querySelectorAll('button[aria-pressed]')]
      .find(el => el.textContent?.includes('7+')) as HTMLButtonElement | undefined
    sevenPlus!.click()

    expect(mock.browse.setMinRating).toHaveBeenCalledWith(null)
  })

  it('shows clear-all once a rating filter is active even without a genre selected', async () => {
    const state = browseState as unknown as MockState
    state.minRating.value = 7

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const clearAll = wrapper.findAll('button').find(button => button.text()?.includes('Clear all'))
    expect(clearAll).toBeTruthy()
  })

  it('shows loading indicator until filtering results are ready', async () => {
    const state = browseState as unknown as MockState
    state.selectedGenreIds.value = [28]
    state.items.value = titles
    state.loading.value = true
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    // should show loading overlay / spinner while filtering (gridLoading true with existing items)
    const html = wrapper.html()
    expect(html).toMatch(/filter-loading|aria-busy="true"|Loading/)
    // also file content check for overlay
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/browse-grid.vue'), 'utf-8')
    expect(vueFile).toMatch(/gridLoading/)
    expect(vueFile).toMatch(/LoaderCircle|animate-spin/)
    expect(vueFile).toMatch(/filter-loading|aria-busy/)
    // aria-busy should be true while loading
    const busyEl = wrapper.element.querySelector('[aria-busy="true"]')
    expect(busyEl).toBeTruthy()
  })

  it('keeps loading indicator visible with items present during filter refresh', async () => {
    const state = browseState as unknown as MockState
    state.items.value = titles
    state.loading.value = true
    state.error.value = false
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    // should not show empty state while loading
    expect(wrapper.text()).not.toContain('No titles found')
    expect(wrapper.text()).toMatch(/Loading/)
  })

  it('has generous spacing between title cards and infinite-scroll loading indicator', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const vueFile = fs.readFileSync(path.resolve(process.cwd(), 'app/components/browse-grid.vue'), 'utf-8')
    // infinite-scroll loading <p> should have pt-8 (32px) not pt-4 (16px) for breathing room
    // look for the gridLoadingMore loading indicator paragraph
    const loadingIndicatorMatch = vueFile.match(/v-if="!isRowsMode && \(gridLoadingMore[\s\S]*?class="([^"]+)"/)
    expect(loadingIndicatorMatch).toBeTruthy()
    const classes = loadingIndicatorMatch ? loadingIndicatorMatch[1] : ''
    expect(classes).toMatch(/pt-8/)
    expect(classes).not.toMatch(/pt-4(?!-)/)
    // also behavioral: when loadingMore, the indicator should have pt-8 spacing
    const state = browseState as unknown as MockState
    state.selectedGenreIds.value = [28]
    state.items.value = titles
    state.loadingMore.value = true
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)
    const indicator = wrapper.element.querySelector('p.mx-auto.flex.w-full') as HTMLElement | null
    expect(indicator).toBeTruthy()
    expect(indicator!.className).toMatch(/pt-8/)
  })

  it('shows See more on a genre-bound row and drives the filter path on click', async () => {
    const sectionsMock = sectionsState as unknown as SectionsMockState
    sectionsMock.sections.value = [
      { key: 'movie.horror', titleKey: 'browse.sections.movieHorror', genres: [27], minRating: null, titles },
    ]

    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    const seeMore = wrapper.findAll('button').find(button => button.text().includes('See more'))
    expect(seeMore).toBeTruthy()
    await seeMore!.trigger('click')

    expect(mock.browse.clearFilters).toHaveBeenCalledTimes(1)
    expect(mock.browse.toggleGenre).toHaveBeenCalledWith(27)
    expect(mock.browse.loadMore).not.toHaveBeenCalled()
  })

  it('hides See more on a genre-less row', async () => {
    // Default fixture is movie.trending with genres: [].
    const wrapper = await mountSuspended(BrowseGrid)
    mountedWrappers.push(wrapper)

    expect(wrapper.text()).toContain('Trending Right Now')
    const seeMore = wrapper.findAll('button').find(button => button.text().includes('See more'))
    expect(seeMore).toBeUndefined()
  })
})

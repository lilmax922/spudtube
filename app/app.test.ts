import type { Genre, TitleSummary } from '#server/tmdb/types'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import App from './app.vue'

const mock = vi.hoisted(() => ({
  browse: {
    refresh: vi.fn(),
    loadMore: vi.fn(),
    applySection: vi.fn(),
    setKind: vi.fn(),
    toggleGenre: vi.fn(),
    clearGenres: vi.fn(),
    setMinRating: vi.fn(),
    toggleProvider: vi.fn(),
    clearProviders: vi.fn(),
    clearFilters: vi.fn(),
    searchProviders: vi.fn(),
    clearProviderSearch: vi.fn(),
  },
  search: {
    search: vi.fn(),
    clear: vi.fn(),
  },
  navigateTo: vi.fn(),
}))

mockNuxtImport('navigateTo', () => mock.navigateTo)

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
  query: shallowRef(''),
  searchedQuery: shallowRef(''),
  mode: shallowRef<'browse' | 'search'>('browse'),
  items: shallowRef<TitleSummary[]>([]),
  page: shallowRef(0),
  totalPages: shallowRef(0),
  loading: shallowRef(false),
  loadingMore: shallowRef(false),
  error: shallowRef(false),
  hasMore: shallowRef(false),
}

const listingState = {
  mode: shallowRef<'browse' | 'search'>('browse'),
  searchedQuery: shallowRef(''),
  rows: shallowRef<Array<{ key: string, titleKey: string, items: TitleSummary[], canSeeMore: boolean }>>([]),
  popularProviders: shallowRef<{ id: number, name: string, logoPath: string | null }[]>([]),
  providerSearchResults: shallowRef<{ id: number, name: string, logoPath: string | null }[]>([]),
  providerSearchQuery: shallowRef(''),
  providerSearchLoading: shallowRef(false),
}

// Header, grid, and overlay all cross the same BrowseListing seam.
vi.mock('./composables/use-browse-listing', () => ({
  useBrowseListing: () => ({
    ...browseState,
    ...listingState,
    refresh: mock.browse.refresh,
    loadMore: mock.browse.loadMore,
    applySection: mock.browse.applySection,
    setKind: mock.browse.setKind,
    toggleGenre: mock.browse.toggleGenre,
    clearGenres: mock.browse.clearGenres,
    setMinRating: mock.browse.setMinRating,
    toggleProvider: mock.browse.toggleProvider,
    clearProviders: mock.browse.clearProviders,
    clearFilters: mock.browse.clearFilters,
    search: mock.search.search,
    clearSearch: mock.search.clear,
    searchProviders: mock.browse.searchProviders,
    clearProviderSearch: mock.browse.clearProviderSearch,
  }),
}))

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
]

const genres: Genre[] = [
  { id: 28, name: '動作' },
  { id: 878, name: '科幻' },
]

describe('app shell', () => {
  afterEach(() => {
    vi.useRealTimers()
    mock.search.search.mockReset()
    mock.search.clear.mockReset()
    mock.navigateTo.mockReset()
    searchState.query.value = ''
    searchState.mode.value = 'browse'
    searchState.searchedQuery.value = ''
    listingState.mode.value = 'browse'
    listingState.rows.value = []
    browseState.items.value = []
    browseState.genres.value = []
  })

  it('renders brand and lands directly on the browse grid', async () => {
    browseState.items.value = titles
    browseState.genres.value = genres

    const wrapper = await mountSuspended(App, { route: '/' })

    expect(wrapper.text()).toContain('SpudTube')
    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('Movies')
  })

  it('renders a search trigger in the header that opens the overlay', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })

    const trigger = wrapper.find('button[aria-label="Open search"]')
    expect(trigger.exists()).toBe(true)
    expect(wrapper.find('input[type="search"]').exists()).toBe(false)

    await trigger.trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('input[type="search"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('Search movies and TV shows')
  })

  it('drives the shared search while typing in overlay and restores browse on dismiss', async () => {
    vi.useFakeTimers()
    browseState.items.value = titles
    browseState.genres.value = genres
    const wrapper = await mountSuspended(App, { route: '/' })
    await wrapper.find('button[aria-label="Open search"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('input[type="search"]').setValue('dune')
    await vi.advanceTimersByTimeAsync(400)
    // overlay typing drives the shared session behind one seam
    expect(mock.search.search).toHaveBeenCalledWith('dune')

    // dismiss without navigating restores the session the overlay started
    await wrapper.find('[role="presentation"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(mock.search.clear).toHaveBeenCalled()
  })

  it('navigates to /search on submit with Enter', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    await wrapper.find('button[aria-label="Open search"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('input[type="search"]').setValue('dune')
    await wrapper.find('form[role="search"]').trigger('submit')

    expect(mock.navigateTo).toHaveBeenCalledWith({ path: '/search', query: { q: 'dune' } })
    // global search should not be called directly; navigation drives search page
    expect(mock.search.search).not.toHaveBeenCalled()
    // navigating keeps the session so the page reuses the results as-is
    expect(mock.search.clear).not.toHaveBeenCalled()
  })

  it('clears the overlay query via the field clear button without invoking global clear', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    await wrapper.find('button[aria-label="Open search"]').trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('input[type="search"]')
    await input.setValue('dune')
    await wrapper.vm.$nextTick()

    const clear = wrapper.find('button[aria-label="Clear search"]')
    expect(clear.exists()).toBe(true)

    await clear.trigger('click')
    await wrapper.vm.$nextTick()

    const updatedInput = wrapper.find('input[type="search"]')
    expect((updatedInput.element as HTMLInputElement).value).toBe('')
    // clearing the overlay query clears the shared session it drives
    expect(mock.search.clear).toHaveBeenCalled()
  })

  it('closes the search overlay via close button, backdrop and Escape without trapping', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    const trigger = wrapper.find('button[aria-label="Open search"]')
    await trigger.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    const close = wrapper.find('button[aria-label="Close search"]')
    // when query empty, button is close
    expect(close.exists()).toBe(true)
    await close.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await trigger.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    // backdrop click (outer container)
    await wrapper.find('[role="presentation"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await trigger.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('shows close button when query empty and clear button when query present (clearable decoupled)', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    await wrapper.find('button[aria-label="Open search"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('button[aria-label="Close search"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(false)

    await wrapper.find('input[type="search"]').setValue('dune')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(true)
  })

  it('opens and toggles the search overlay with Cmd+K / Ctrl+K', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    // ⌘K (macOS) opens
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    // Ctrl+K (Windows/Linux) also opens after closing
    await wrapper.find('button[aria-label="Close search"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    // same shortcut toggles closed again
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    // plain k without modifier must not open
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('updates the kind in place when the Movies button is clicked from the home route', async () => {
    browseState.items.value = titles
    browseState.genres.value = genres
    const wrapper = await mountSuspended(App, { route: '/' })

    const moviesBtn = wrapper.findAll('button').find(btn => btn.text().includes('Movies') && btn.attributes('data-kind') === 'movie')
    expect(moviesBtn).toBeTruthy()
    await moviesBtn!.trigger('click')

    expect(mock.browse.setKind).toHaveBeenCalledWith('MOVIE')
    // No navigation away from home
    expect(mock.navigateTo).not.toHaveBeenCalledWith(expect.objectContaining({ path: '/' }))
  })

  it('switches kind to TV and stays on home when TV shows is clicked from /', async () => {
    browseState.kind.value = 'MOVIE'
    browseState.items.value = titles
    browseState.genres.value = genres
    const wrapper = await mountSuspended(App, { route: '/' })

    const tvBtn = wrapper.findAll('button').find(btn => btn.text().includes('TV Shows') && btn.attributes('data-kind') === 'tv')
    expect(tvBtn).toBeTruthy()
    await tvBtn!.trigger('click')

    expect(mock.browse.setKind).toHaveBeenCalledWith('TV_SHOW')
    expect(mock.navigateTo).not.toHaveBeenCalled()
  })

  it('navigates back to the home route and updates kind when Movies is clicked off-home', async () => {
    browseState.items.value = titles
    browseState.genres.value = genres
    const wrapper = await mountSuspended(App, { route: '/movie/419430' })

    const moviesBtn = wrapper.findAll('button').find(btn => btn.text().includes('Movies') && btn.attributes('data-kind') === 'movie')
    expect(moviesBtn).toBeTruthy()
    await moviesBtn!.trigger('click')

    expect(mock.browse.setKind).toHaveBeenCalledWith('MOVIE')
    expect(mock.navigateTo).toHaveBeenCalledWith('/')
  })

  it('navigates back to the home route and updates kind to TV when TV shows is clicked off-home', async () => {
    browseState.items.value = titles
    browseState.genres.value = genres
    const wrapper = await mountSuspended(App, { route: '/movie/419430' })

    const tvBtn = wrapper.findAll('button').find(btn => btn.text().includes('TV Shows') && btn.attributes('data-kind') === 'tv')
    expect(tvBtn).toBeTruthy()
    await tvBtn!.trigger('click')

    expect(mock.browse.setKind).toHaveBeenCalledWith('TV_SHOW')
    expect(mock.navigateTo).toHaveBeenCalledWith('/')
  })
})

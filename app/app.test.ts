import type { Genre, TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import App from './app.vue'

const mock = vi.hoisted(() => ({
  browse: {
    refresh: vi.fn(),
    loadMore: vi.fn(),
    setKind: vi.fn(),
    toggleGenre: vi.fn(),
    clearGenres: vi.fn(),
  },
  search: {
    search: vi.fn(),
    clear: vi.fn(),
  },
}))

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

vi.mock('./composables/use-browse-grid', () => ({
  useBrowseGrid: () => ({
    ...browseState,
    refresh: mock.browse.refresh,
    loadMore: mock.browse.loadMore,
    setKind: mock.browse.setKind,
    toggleGenre: mock.browse.toggleGenre,
    clearGenres: mock.browse.clearGenres,
  }),
}))

vi.mock('./composables/use-search-state', () => ({
  useSearchState: () => ({
    ...searchState,
    search: mock.search.search,
    clear: mock.search.clear,
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
    searchState.query.value = ''
    searchState.mode.value = 'browse'
    searchState.searchedQuery.value = ''
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

  it('debounces typing before searching via the overlay', async () => {
    vi.useFakeTimers()
    const wrapper = await mountSuspended(App, { route: '/' })
    await wrapper.find('button[aria-label="Open search"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('input[type="search"]').setValue('dune')
    expect(mock.search.search).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(200)
    expect(mock.search.search).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(150)
    expect(mock.search.search).toHaveBeenCalledWith('dune')
  })

  it('searches immediately on submit without waiting for the debounce', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    await wrapper.find('button[aria-label="Open search"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('input[type="search"]').setValue('dune')
    await wrapper.find('form[role="search"]').trigger('submit')

    expect(mock.search.search).toHaveBeenCalledWith('dune')
  })

  it('clears the search state via the field clear button', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    searchState.query.value = 'dune'
    await wrapper.find('button[aria-label="Open search"]').trigger('click')
    await wrapper.vm.$nextTick()

    const clear = wrapper.find('button[aria-label="Clear search"]')
    expect(clear.exists()).toBe(true)

    await clear.trigger('click')

    expect(mock.search.clear).toHaveBeenCalled()
  })

  it('closes the search overlay via close button, backdrop and Escape without trapping', async () => {
    const wrapper = await mountSuspended(App, { route: '/' })
    const trigger = wrapper.find('button[aria-label="Open search"]')
    await trigger.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    const close = wrapper.find('button[aria-label="Close search"]')
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

  it('keeps the clear button visible in search mode even with an empty query via clearable', async () => {
    searchState.mode.value = 'search'
    searchState.query.value = ''
    const wrapper = await mountSuspended(App, { route: '/' })
    await wrapper.find('button[aria-label="Open search"]').trigger('click')
    await wrapper.vm.$nextTick()

    const clear = wrapper.find('button[aria-label="Clear search"]')
    expect(clear.exists()).toBe(true)
    searchState.mode.value = 'browse'
  })
})

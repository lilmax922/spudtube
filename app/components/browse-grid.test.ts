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

const mock = vi.hoisted(() => {
  function ref<T>(value: T): { value: T, __v_isRef: true } {
    return { value, __v_isRef: true }
  }
  return {
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
})

vi.mock('../composables/use-browse-grid', () => ({
  useBrowseGrid: () => ({
    ...mock.state,
    refresh: mock.refresh,
    loadMore: mock.loadMore,
    setKind: mock.setKind,
    toggleGenre: mock.toggleGenre,
    clearGenres: mock.clearGenres,
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

const genres: Genre[] = [
  { id: 28, name: '動作' },
  { id: 878, name: '科幻' },
]

beforeEach(() => {
  const state = mock.state as MockState
  state.kind.value = 'MOVIE'
  state.selectedGenreIds.value = []
  state.genres.value = genres
  state.items.value = titles
  state.loading.value = false
  state.loadingMore.value = false
  state.error.value = false
})

afterEach(() => {
  mock.refresh.mockReset()
  mock.loadMore.mockReset()
  mock.setKind.mockReset()
  mock.toggleGenre.mockReset()
  mock.clearGenres.mockReset()
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

    expect(mock.setKind).toHaveBeenCalledWith('TV_SHOW')
  })

  it('toggles a genre chip and applies the selection', async () => {
    const wrapper = await mountSuspended(BrowseGrid)

    await wrapper.findAll('button').find(button => button.text() === '科幻')!.trigger('click')

    expect(mock.toggleGenre).toHaveBeenCalledWith(878)
  })

  it('reveals and invokes clear-all once genres are selected', async () => {
    const state = mock.state as MockState
    state.selectedGenreIds.value = [28]

    const wrapper = await mountSuspended(BrowseGrid)

    const clearAll = wrapper.findAll('button').find(button => button.text() === 'Clear all')!
    expect(clearAll).toBeTruthy()

    await clearAll.trigger('click')

    expect(mock.clearGenres).toHaveBeenCalled()
  })

  it('loads the next page when the sentinel becomes visible', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

    await mountSuspended(BrowseGrid)

    const observer = FakeIntersectionObserver.instances[0]!
    observer.callback([{ isIntersecting: true }])

    expect(mock.loadMore).toHaveBeenCalledTimes(1)
  })
})

import type { Genre, TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import App from './app.vue'

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

vi.mock('./composables/use-browse-grid', () => ({
  useBrowseGrid: () => ({
    kind: 'MOVIE',
    selectedGenreIds: [],
    genres,
    items: titles,
    loading: false,
    loadingMore: false,
    error: false,
    refresh: vi.fn(),
    loadMore: vi.fn(),
    setKind: vi.fn(),
    toggleGenre: vi.fn(),
    clearGenres: vi.fn(),
  }),
}))

describe('app shell', () => {
  it('renders brand and lands directly on the browse grid', async () => {
    const wrapper = await mountSuspended(App)

    expect(wrapper.text()).toContain('SpudTube')
    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('Movies')
  })
})

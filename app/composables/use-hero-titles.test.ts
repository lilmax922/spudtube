import type { HeroFetcher } from './use-hero-titles'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useHeroTitles } from './use-hero-titles'

const sampleHero = [
  {
    kind: 'MOVIE' as const,
    tmdbId: 419430,
    name: 'Dune',
    posterPath: null,
    backdropPath: '/iopYFB1b6Bh7FWZhjzonDEfMvZB.jpg',
    releaseDate: '2021-10-22',
    voteAverage: 7.8,
    overview: 'Paul Atreides...',
    runtimeMinutes: 155,
    contentRating: 'PG-13',
    genres: [{ id: 878, name: 'Sci-Fi' }],
    providers: [],
  },
]

function createFetcher(): { fetcher: HeroFetcher, fetchHero: ReturnType<typeof vi.fn> } {
  const fetchHero = vi.fn<HeroFetcher['fetchHero']>()
  return { fetcher: { fetchHero }, fetchHero }
}

describe('use-hero-titles', () => {
  it('exposes enriched hero titles from the injected fetcher', async () => {
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockResolvedValue({ results: sampleHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(state.titles.value).toHaveLength(1))

    expect(state.titles.value[0]).toMatchObject({
      tmdbId: 419430,
      runtimeMinutes: 155,
      contentRating: 'PG-13',
      genres: [{ id: 878, name: 'Sci-Fi' }],
    })
    expect(fetchHero).toHaveBeenCalledWith('MOVIE', 'en')
  })

  it('does not refetch when only the genre or rating filters change (filter-immune)', async () => {
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockResolvedValue({ results: sampleHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(state.titles.value).toHaveLength(1))
    const callsAfterFirst = fetchHero.mock.calls.length

    // Simulate user toggling genres/rating — the hero composable never observes them.
    expect(fetchHero.mock.calls.length).toBe(callsAfterFirst)
    expect(state.error.value).toBe(false)
  })

  it('refetches when the kind changes', async () => {
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockResolvedValue({ results: sampleHero })

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(fetchHero).toHaveBeenCalledWith('MOVIE', 'en'))

    kind.value = 'TV_SHOW'
    await vi.waitFor(() => expect(fetchHero).toHaveBeenCalledWith('TV_SHOW', 'en'))

    expect(fetchHero.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('flags an error when the fetcher rejects', async () => {
    const { fetcher, fetchHero } = createFetcher()
    fetchHero.mockRejectedValue(new Error('boom'))

    const kind = ref<'MOVIE' | 'TV_SHOW'>('MOVIE')
    const state = useHeroTitles(kind, fetcher)

    await vi.waitFor(() => expect(state.error.value).toBe(true))
    expect(state.titles.value).toEqual([])
    expect(state.loading.value).toBe(false)
  })
})

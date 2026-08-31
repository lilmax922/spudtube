import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  trending: vi.fn(),
  title: vi.fn(),
  watchProviders: vi.fn(),
}))

vi.mock('../../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./hero.get')).default

describe('gET /api/catalog/[kind]/hero', () => {
  const router = createRouter()
  router.get('/api/catalog/:kind/hero', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.trending.mockReset()
    fakeClient.title.mockReset()
    fakeClient.watchProviders.mockReset()
  })

  it('returns the top 5 trending titles enriched with detail fields', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [
        { kind: 'MOVIE', tmdbId: 1, name: 'A', posterPath: null, backdropPath: null, releaseDate: '2020-01-01', voteAverage: 6, genreIds: [] },
        { kind: 'MOVIE', tmdbId: 2, name: 'B', posterPath: null, backdropPath: null, releaseDate: '2020-01-01', voteAverage: 8, genreIds: [] },
        { kind: 'MOVIE', tmdbId: 3, name: 'C', posterPath: null, backdropPath: null, releaseDate: '2020-01-01', voteAverage: 9, genreIds: [] },
      ],
      totalPages: 1,
      totalResults: 3,
    })
    fakeClient.title.mockImplementation(async (_kind: 'MOVIE', id: number) => ({
      kind: 'MOVIE',
      tmdbId: id,
      name: id === 3 ? 'C' : 'X',
      posterPath: null,
      backdropPath: null,
      releaseDate: null,
      voteAverage: null,
      overview: '',
      tagline: null,
      originalName: null,
      originalLanguage: null,
      status: null,
      genres: [{ id: 28, name: 'Action' }],
      runtimeMinutes: 120,
      trailerKey: null,
      budget: null,
      revenue: null,
      contentRating: 'PG-13',
      cast: [],
      crew: [],
      backdrops: [],
    }))
    fakeClient.watchProviders.mockResolvedValue({})

    const response = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results).toHaveLength(3)
    // Sorted by voteAverage desc; C (9) first, B (8), A (6)
    expect(body.results.map((r: { tmdbId: number }) => r.tmdbId)).toEqual([3, 2, 1])
    expect(body.results[0].runtimeMinutes).toBe(120)
    expect(body.results[0].contentRating).toBe('PG-13')
    expect(body.results[0].genres).toEqual([{ id: 28, name: 'Action' }])
    expect(body.results[0].providers).toEqual([])
  })

  it('caps the result set to five titles even when trending returns more', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      kind: 'MOVIE' as const,
      tmdbId: i + 1,
      name: `T${i}`,
      posterPath: null,
      backdropPath: null,
      releaseDate: '2020-01-01',
      voteAverage: 5 + i,
      genreIds: [],
    }))
    fakeClient.trending.mockResolvedValue({ page: 1, results: many, totalPages: 1, totalResults: 8 })
    fakeClient.title.mockResolvedValue(null)
    fakeClient.watchProviders.mockResolvedValue({})

    const response = await call(new Request('http://localhost/api/catalog/movie/hero'))
    const body = await response.json()

    expect(body.results).toHaveLength(5)
  })

  it('keeps the title in the payload even if its detail lookup returns null', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [{ kind: 'MOVIE', tmdbId: 9, name: 'Gone', posterPath: null, backdropPath: null, releaseDate: null, voteAverage: 7, genreIds: [] }],
      totalPages: 1,
      totalResults: 1,
    })
    fakeClient.title.mockResolvedValue(null)
    fakeClient.watchProviders.mockResolvedValue({})

    const response = await call(new Request('http://localhost/api/catalog/movie/hero'))
    const body = await response.json()

    expect(body.results[0].tmdbId).toBe(9)
    expect(body.results[0].runtimeMinutes).toBeNull()
    expect(body.results[0].contentRating).toBeNull()
    expect(body.results[0].genres).toEqual([])
  })

  it('attaches providers for the resolved region to each result', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [{ kind: 'MOVIE', tmdbId: 1, name: 'A', posterPath: null, backdropPath: null, releaseDate: '2020', voteAverage: 8, genreIds: [] }],
      totalPages: 1,
      totalResults: 1,
    })
    fakeClient.title.mockResolvedValue({
      kind: 'MOVIE',
      tmdbId: 1,
      name: 'A',
      posterPath: null,
      backdropPath: null,
      releaseDate: null,
      voteAverage: null,
      overview: '',
      tagline: null,
      originalName: null,
      originalLanguage: null,
      status: null,
      genres: [],
      runtimeMinutes: 100,
      trailerKey: null,
      budget: null,
      revenue: null,
      contentRating: null,
      cast: [],
      crew: [],
      backdrops: [],
    })
    fakeClient.watchProviders.mockResolvedValue({
      TW: {
        link: null,
        groups: {
          subscription: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }],
          free: [],
          rent: [],
          buy: [],
        },
      },
    })

    const response = await call(
      new Request('http://localhost/api/catalog/movie/hero', { headers: { 'cf-ipcountry': 'TW' } }),
    )
    const body = await response.json()

    expect(body.results[0].providers).toEqual([{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }])
  })

  it('rejects an unknown kind', async () => {
    const response = await call(new Request('http://localhost/api/catalog/book/hero'))
    expect(response.status).toBe(400)
    expect(fakeClient.trending).not.toHaveBeenCalled()
  })

  it('excludes titles without backdropPath when selecting hero slides (prefers backdrops)', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [
        { kind: 'MOVIE', tmdbId: 1, name: 'NoBackdrop High', posterPath: null, backdropPath: null, releaseDate: '2020-01-01', voteAverage: 9.5, genreIds: [] },
        { kind: 'MOVIE', tmdbId: 2, name: 'HasBackdrop Mid', posterPath: null, backdropPath: '/has.jpg', releaseDate: '2020-01-01', voteAverage: 9.0, genreIds: [] },
        { kind: 'MOVIE', tmdbId: 3, name: 'HasBackdrop Low', posterPath: null, backdropPath: '/has2.jpg', releaseDate: '2020-01-01', voteAverage: 8.0, genreIds: [] },
      ],
      totalPages: 1,
      totalResults: 3,
    })
    fakeClient.title.mockImplementation(async (_kind: 'MOVIE', id: number) => ({
      kind: 'MOVIE',
      tmdbId: id,
      name: `Title ${id}`,
      posterPath: null,
      backdropPath: id === 1 ? null : `/has${id}.jpg`,
      releaseDate: null,
      voteAverage: null,
      overview: '',
      tagline: null,
      originalName: null,
      originalLanguage: null,
      status: null,
      genres: [],
      runtimeMinutes: 100,
      trailerKey: null,
      budget: null,
      revenue: null,
      contentRating: null,
      cast: [],
      crew: [],
      backdrops: [],
    }))
    fakeClient.watchProviders.mockResolvedValue({})

    const response = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))
    const body = await response.json()

    expect(response.status).toBe(200)
    // Null backdrop title (tmdbId 1) should be excluded even though it has highest rating
    expect(body.results.map((r: { tmdbId: number }) => r.tmdbId)).not.toContain(1)
    expect(body.results.map((r: { tmdbId: number }) => r.tmdbId)).toEqual([2, 3])
    expect(body.results.every((r: { backdropPath: string | null }) => r.backdropPath != null)).toBe(true)
  })

  it('falls back to detail backdrop when trending summary has null backdrop', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [{ kind: 'MOVIE', tmdbId: 1, name: 'A', posterPath: null, backdropPath: null, releaseDate: '2020', voteAverage: 8, genreIds: [] }],
      totalPages: 1,
      totalResults: 1,
    })
    fakeClient.title.mockResolvedValue({
      kind: 'MOVIE',
      tmdbId: 1,
      name: 'A',
      posterPath: null,
      backdropPath: '/detail-backdrop.jpg',
      releaseDate: null,
      voteAverage: null,
      overview: '',
      tagline: null,
      originalName: null,
      originalLanguage: null,
      status: null,
      genres: [],
      runtimeMinutes: 100,
      trailerKey: null,
      budget: null,
      revenue: null,
      contentRating: null,
      cast: [],
      crew: [],
      backdrops: [],
    })
    fakeClient.watchProviders.mockResolvedValue({})

    const response = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))
    const body = await response.json()

    expect(body.results[0].backdropPath).toBe('/detail-backdrop.jpg')
  })
})

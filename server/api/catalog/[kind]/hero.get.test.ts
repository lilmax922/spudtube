import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { __resetNitropackRuntimeCache } from '../../../../vitest.stubs/nitropack-runtime'

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
    __resetNitropackRuntimeCache()
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

  it('keeps the title in the payload even if its detail lookup rejects', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [{ kind: 'MOVIE', tmdbId: 9, name: 'Gone', posterPath: null, backdropPath: null, releaseDate: null, voteAverage: 7, genreIds: [] }],
      totalPages: 1,
      totalResults: 1,
    })
    fakeClient.title.mockRejectedValueOnce(new Error('tmdb 500'))
    fakeClient.watchProviders.mockResolvedValue({})

    const response = await call(new Request('http://localhost/api/catalog/movie/hero'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results[0].tmdbId).toBe(9)
    expect(body.results[0].runtimeMinutes).toBeNull()
    expect(body.results[0].contentRating).toBeNull()
    expect(body.results[0].genres).toEqual([])
    expect(body.results[0].providers).toEqual([])
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

  it('serves a repeat visit from the 6h cache without hitting TMDB again', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [{ kind: 'MOVIE', tmdbId: 1, name: 'A', posterPath: null, backdropPath: '/a.jpg', releaseDate: '2020', voteAverage: 8, genreIds: [] }],
      totalPages: 1,
      totalResults: 1,
    })
    fakeClient.title.mockResolvedValue(null)
    fakeClient.watchProviders.mockResolvedValue({})

    const first = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))
    const second = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual(await first.json())
    expect(fakeClient.trending).toHaveBeenCalledTimes(1)
  })

  it('keys the cache by region so a region switch refetches providers', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [{ kind: 'MOVIE', tmdbId: 1, name: 'A', posterPath: null, backdropPath: '/a.jpg', releaseDate: '2020', voteAverage: 8, genreIds: [] }],
      totalPages: 1,
      totalResults: 1,
    })
    fakeClient.title.mockResolvedValue(null)
    fakeClient.watchProviders.mockResolvedValue({})
    // Title lookup misses so providers stay empty; the region split is observed
    // through the upstream fetch count, not the payload.
    await call(new Request('http://localhost/api/catalog/movie/hero?language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    await call(new Request('http://localhost/api/catalog/movie/hero?language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    expect(fakeClient.trending).toHaveBeenCalledTimes(1)

    await call(new Request('http://localhost/api/catalog/movie/hero?language=en', { headers: { 'cf-ipcountry': 'US' } }))
    expect(fakeClient.trending).toHaveBeenCalledTimes(2)
  })

  it('keeps the varies headers visible to the handler so a cached region key attaches the same region providers', async () => {
    const trendingTitle = { kind: 'MOVIE', tmdbId: 1, name: 'A', posterPath: null, backdropPath: '/a.jpg', releaseDate: '2020', voteAverage: 8, genreIds: [] }
    fakeClient.trending.mockResolvedValue({ page: 1, results: [trendingTitle], totalPages: 1, totalResults: 1 })
    fakeClient.title.mockResolvedValue({
      kind: 'MOVIE',
      tmdbId: 1,
      name: 'A',
      posterPath: null,
      backdropPath: '/a.jpg',
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
    fakeClient.watchProviders.mockImplementation(async () => ({
      TW: {
        link: null,
        groups: {
          subscription: [{ id: 8, name: 'TW-Flix', logoPath: '/n.jpg' }],
          free: [],
          rent: [],
          buy: [],
        },
      },
      US: {
        link: null,
        groups: {
          subscription: [{ id: 8, name: 'US-Flix', logoPath: '/n.jpg' }],
          free: [],
          rent: [],
          buy: [],
        },
      },
    }))

    await call(new Request('http://localhost/api/catalog/movie/hero?language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    const usResponse = await call(new Request('http://localhost/api/catalog/movie/hero?language=en', { headers: { 'cf-ipcountry': 'US' } }))
    const usBody = await usResponse.json()

    expect(fakeClient.trending).toHaveBeenCalledTimes(2)
    expect(usBody.results[0].providers).toEqual([{ id: 8, name: 'US-Flix', logoPath: '/n.jpg' }])
  })

  it('emits s-maxage plus a day of stale-while-revalidate so downstream caches serve stale during an outage', async () => {
    fakeClient.trending.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    const response = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))

    expect(response.headers.get('cache-control')).toContain('s-maxage=21600')
    expect(response.headers.get('cache-control')).toContain('stale-while-revalidate=86400')
  })

  it('serves the stale hero payload while TMDB stalls past entry expiry, then heals once TMDB recovers', async () => {
    // Phase-1 loop for the PR70 skeleton-forever outage: with swr:false the
    // expired 6h entry is discarded and the homepage blocks on the live TMDB
    // fetch (the Nitro pending slot pins every same-key request with it).
    // The source fix serves the stale entry instantly and revalidates in
    // the background. Silent sockets, dripping bodies, and hung headers all
    // collapse to one shape at this seam (the loader never settles); the
    // socket shapes are pinned at the client seam by fetchJsonWithTimeout's
    // silent/drip tests. Date is faked for the 6h time travel but timers
    // stay real: h3 needs live timers to settle a request, and the budget
    // race below must be driven by a real clock.
    vi.useFakeTimers({ toFake: ['Date'] })
    const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
    try {
      const warmTitle = { kind: 'MOVIE', tmdbId: 1, name: 'Warm', posterPath: null, backdropPath: '/warm.jpg', releaseDate: '2020', voteAverage: 8, genreIds: [] }
      fakeClient.trending.mockResolvedValue({ page: 1, results: [warmTitle], totalPages: 1, totalResults: 1 })
      fakeClient.title.mockResolvedValue(null)
      fakeClient.watchProviders.mockResolvedValue({})

      const first = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))
      expect(first.status).toBe(200)
      const warmBody = await first.json()

      // The 6h entry expires while TMDB stalls.
      vi.setSystemTime(Date.now() + 21601 * 1000)
      let trendingCalls = 0
      let rejectStalled: ((error: unknown) => void) | undefined
      fakeClient.trending.mockImplementation(() => {
        trendingCalls++
        return new Promise((_resolve, reject) => {
          rejectStalled = reject
        })
      })

      const stalled = await Promise.race([
        call(new Request('http://localhost/api/catalog/movie/hero?language=en')).then(async response => ({ status: response.status, body: await response.json() })),
        sleep(1000).then(() => 'TIMEOUT' as const),
      ])
      expect(stalled).not.toBe('TIMEOUT')
      expect(stalled).toEqual({ status: 200, body: warmBody })
      // Exactly one background revalidation: stale is served AND refreshed,
      // never stale-forever and never a refetch herd.
      expect(trendingCalls).toBe(1)

      // The stalled background revalidation rejects (production bounds every
      // loader with the 10s fetch+JSON budget); the stale entry survives it.
      // TMDB recovers: poll for the healed payload instead of sleeping a
      // fixed span, so CI jank cannot observe the stale entry before the
      // background heal lands. Each poll visit serves stale while triggering
      // the next background revalidation.
      fakeClient.trending.mockResolvedValue({ page: 1, results: [{ ...warmTitle, tmdbId: 2, name: 'Fresh' }], totalPages: 1, totalResults: 1 })
      rejectStalled?.(new Error('TMDB request timeout after 10000ms'))
      await sleep(20)
      const healed = await (async () => {
        const deadline = Date.now() + 5000
        for (;;) {
          const response = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))
          const body = await response.json() as { results?: { tmdbId?: number }[] }
          if (body.results?.[0]?.tmdbId === 2 || Date.now() > deadline)
            return { status: response.status, body }
          await sleep(20)
        }
      })()
      expect(healed.status).toBe(200)
      expect(healed.body).toMatchObject({ results: [{ tmdbId: 2 }] })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('retries after a 504 timeout instead of serving the error from the 6h cache', async () => {
    // Homepage hero shares the tarpit outage shape: a stalled TMDB
    // trending read must surface as an error and never pin a cached
    // payload, so the retry refetches and serves the live result.
    fakeClient.trending.mockRejectedValueOnce(new Error('TMDB request timeout after 10000ms'))
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [{ kind: 'MOVIE', tmdbId: 1, name: 'A', posterPath: null, backdropPath: '/a.jpg', releaseDate: '2020', voteAverage: 8, genreIds: [] }],
      totalPages: 1,
      totalResults: 1,
    })
    fakeClient.title.mockResolvedValue(null)
    fakeClient.watchProviders.mockResolvedValue({})

    const failed = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))
    expect(failed.status).toBe(500)

    const retried = await call(new Request('http://localhost/api/catalog/movie/hero?language=en'))
    expect(retried.status).toBe(200)
    expect((await retried.json()).results).toHaveLength(1)
    expect(fakeClient.trending).toHaveBeenCalledTimes(2)
  })
})

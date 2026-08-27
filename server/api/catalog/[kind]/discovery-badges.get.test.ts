import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  trending: vi.fn(),
  topRated: vi.fn(),
}))

vi.mock('../../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./discovery-badges.get')).default

describe('gET /api/catalog/:kind/discovery-badges', () => {
  const router = createRouter()
  router.get('/api/catalog/:kind/discovery-badges', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.trending.mockReset()
    fakeClient.topRated.mockReset()
  })

  it('returns page-1 trending and top-rated id sets for the kind', async () => {
    fakeClient.trending.mockResolvedValue({
      page: 1,
      results: [{ tmdbId: 11 }, { tmdbId: 12 }],
      totalPages: 3,
      totalResults: 60,
    })
    fakeClient.topRated.mockResolvedValue({
      page: 1,
      results: [{ tmdbId: 27205 }],
      totalPages: 250,
      totalResults: 5000,
    })

    const response = await call(
      new Request('http://localhost/api/catalog/movie/discovery-badges', {
        headers: { 'cf-ipcountry': 'TW' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.trending).toHaveBeenCalledWith('MOVIE', 1, 'zh-TW')
    expect(fakeClient.topRated).toHaveBeenCalledWith('MOVIE', 1, 'zh-TW')
    expect(body).toEqual({ trendingIds: [11, 12], topRatedIds: [27205] })
  })

  it('forwards language to both client calls', async () => {
    fakeClient.trending.mockResolvedValue({ page: 1, results: [], totalPages: 0, totalResults: 0 })
    fakeClient.topRated.mockResolvedValue({ page: 1, results: [], totalPages: 0, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/tv/discovery-badges?language=en'))

    expect(fakeClient.trending).toHaveBeenCalledWith('TV_SHOW', 1, 'en')
    expect(fakeClient.topRated).toHaveBeenCalledWith('TV_SHOW', 1, 'en')
  })

  it('rejects an unknown kind', async () => {
    const response = await call(new Request('http://localhost/api/catalog/book/discovery-badges'))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ statusCode: 400 })
    expect(fakeClient.trending).not.toHaveBeenCalled()
    expect(fakeClient.topRated).not.toHaveBeenCalled()
  })
})

import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  recommendations: vi.fn(),
}))

vi.mock('../../../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./recommendations.get')).default

describe('gET /api/catalog/:kind/:id/recommendations', () => {
  const router = createRouter()
  router.get('/api/catalog/:kind/:id/recommendations', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.recommendations.mockReset()
  })

  it('returns paged recommendations for the title, resolving TW geo to zh-TW', async () => {
    fakeClient.recommendations.mockResolvedValue({ page: 2, results: [], totalPages: 3, totalResults: 55 })

    const response = await call(
      new Request('http://localhost/api/catalog/tv/94605/recommendations?page=2', {
        headers: { 'cf-ipcountry': 'TW' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.recommendations).toHaveBeenCalledWith('TV_SHOW', 94605, 2, 'zh-TW')
    expect(body).toEqual({ page: 2, results: [], totalPages: 3, totalResults: 55 })
  })

  it('forwards language for recommendations', async () => {
    fakeClient.recommendations.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/movie/419430/recommendations?language=en'))

    expect(fakeClient.recommendations).toHaveBeenCalledWith('MOVIE', 419430, 1, 'en')
  })

  it('auto-detects en without geo', async () => {
    fakeClient.recommendations.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/tv/94605/recommendations?page=1'))

    expect(fakeClient.recommendations).toHaveBeenLastCalledWith('TV_SHOW', 94605, 1, 'en')
  })
})

import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  trending: vi.fn(),
}))

vi.mock('../../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./trending.get')).default

describe('gET /api/catalog/[kind]/trending', () => {
  const router = createRouter()
  router.get('/api/catalog/:kind/trending', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.trending.mockReset()
  })

  it('returns the trending page for the requested kind and language', async () => {
    fakeClient.trending.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    const response = await call(new Request('http://localhost/api/catalog/movie/trending?language=zh-TW'))

    expect(response.status).toBe(200)
    expect(fakeClient.trending).toHaveBeenCalledWith('MOVIE', 1, 'zh-TW')
  })

  it('rejects an unknown kind', async () => {
    const response = await call(new Request('http://localhost/api/catalog/book/trending'))

    expect(response.status).toBe(400)
    expect(fakeClient.trending).not.toHaveBeenCalled()
  })
})

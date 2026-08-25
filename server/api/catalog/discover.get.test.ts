import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  discover: vi.fn(),
}))

vi.mock('../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./discover.get')).default

describe('gET /api/catalog/discover', () => {
  const router = createRouter()
  router.get('/api/catalog/discover', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.discover.mockReset()
  })

  it('discovers by kind with OR-ed genre ids and page', async () => {
    fakeClient.discover.mockResolvedValue({ page: 2, results: [], totalPages: 4, totalResults: 40 })

    const response = await call(
      new Request('http://localhost/api/catalog/discover?kind=movie&genres=878,35&page=2'),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', { genreIds: [878, 35], page: 2, language: 'zh-TW' })
    expect(body).toEqual({ page: 2, results: [], totalPages: 4, totalResults: 40 })
  })

  it('forwards language to the discover client', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/discover?kind=movie&language=en'))

    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', { genreIds: undefined, page: 1, language: 'en' })
  })

  it('rejects an unknown kind', async () => {
    const response = await call(new Request('http://localhost/api/catalog/discover?kind=book'))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ statusCode: 400 })
    expect(fakeClient.discover).not.toHaveBeenCalled()
  })
})

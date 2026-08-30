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

  it('discovers by kind with OR-ed genre ids and page, resolving TW geo to zh-TW', async () => {
    fakeClient.discover.mockResolvedValue({ page: 2, results: [], totalPages: 4, totalResults: 40 })

    const response = await call(
      new Request('http://localhost/api/catalog/discover?kind=movie&genres=878,35&page=2', {
        headers: { 'cf-ipcountry': 'TW' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', { genreIds: [878, 35], minRating: undefined, page: 2, language: 'zh-TW' })
    expect(body).toEqual({ page: 2, results: [], totalPages: 4, totalResults: 40 })
  })

  it('forwards language to the discover client', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/discover?kind=movie&language=en'))

    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', { genreIds: undefined, minRating: undefined, page: 1, language: 'en' })
  })

  it('forwards minRating when provided', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/discover?kind=movie&minRating=7'))

    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', { genreIds: undefined, minRating: 7, page: 1, language: 'en' })
  })

  it('rejects an out-of-range minRating', async () => {
    const response = await call(new Request('http://localhost/api/catalog/discover?kind=movie&minRating=99'))

    expect(response.status).toBe(400)
    expect(fakeClient.discover).not.toHaveBeenCalled()
  })

  it('auto-detects en without geo and cookie overrides', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/discover?kind=movie'))
    expect(fakeClient.discover).toHaveBeenLastCalledWith('MOVIE', { genreIds: undefined, minRating: undefined, page: 1, language: 'en' })

    fakeClient.discover.mockClear()
    await call(new Request('http://localhost/api/catalog/discover?kind=movie', {
      headers: { 'cf-ipcountry': 'TW', 'cookie': 'spudtube-locale=en' },
    }))
    expect(fakeClient.discover).toHaveBeenLastCalledWith('MOVIE', { genreIds: undefined, minRating: undefined, page: 1, language: 'en' })
  })

  it('rejects an unknown kind', async () => {
    const response = await call(new Request('http://localhost/api/catalog/discover?kind=book'))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ statusCode: 400 })
    expect(fakeClient.discover).not.toHaveBeenCalled()
  })

  it('forwards provider ids to discover with resolved watchRegion', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    const response = await call(
      new Request('http://localhost/api/catalog/discover?kind=movie&providers=8,119', {
        headers: { 'cf-ipcountry': 'TW' },
      }),
    )

    expect(response.status).toBe(200)
    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({
      providerIds: [8, 119],
      watchRegion: 'TW',
    }))
  })

  it('rejects malformed providers param', async () => {
    const response = await call(new Request('http://localhost/api/catalog/discover?kind=movie&providers=abc'))

    expect(response.status).toBe(400)
    expect(fakeClient.discover).not.toHaveBeenCalled()
  })

  it('forwards providers together with genres and rating', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/discover?kind=movie&genres=28&minRating=7&providers=8'))

    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({
      genreIds: [28],
      minRating: 7,
      providerIds: [8],
      watchRegion: expect.any(String),
    }))
  })
})

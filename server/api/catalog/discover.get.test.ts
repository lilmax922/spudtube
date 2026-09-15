import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { __resetNitropackRuntimeCache } from '../../../vitest.stubs/nitropack-runtime'

const { fakeClient, TmdbApiError } = vi.hoisted(() => ({
  fakeClient: {
    discover: vi.fn(),
  },
  TmdbApiError: class TmdbApiError extends Error {
    constructor(status: number) {
      super(`TMDB request failed: ${status}`)
      this.name = 'TmdbApiError'
      this.status = status
    }

    status: number
  },
}))

vi.mock('../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
  TmdbApiError,
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
    __resetNitropackRuntimeCache()
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

    await call(new Request('http://localhost/api/catalog/discover?kind=movie&page=2'))
    expect(fakeClient.discover).toHaveBeenLastCalledWith('MOVIE', { genreIds: undefined, minRating: undefined, page: 2, language: 'en' })

    fakeClient.discover.mockClear()
    await call(new Request('http://localhost/api/catalog/discover?kind=movie&page=3', {
      headers: { 'cf-ipcountry': 'TW', 'cookie': 'spudtube-locale=en' },
    }))
    expect(fakeClient.discover).toHaveBeenLastCalledWith('MOVIE', { genreIds: undefined, minRating: undefined, page: 3, language: 'en' })
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

  it('maps an upstream TMDB 5xx to a 502 instead of an unhandled 500', async () => {
    fakeClient.discover.mockRejectedValue(new TmdbApiError(500))

    const response = await call(new Request('http://localhost/api/catalog/discover?kind=movie&providers=8,119'))

    expect(response.status).toBe(502)
    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({
      providerIds: [8, 119],
    }))
    const body = await response.json()
    expect(body.statusCode).toBe(502)
  })

  it('retries after a 504 timeout instead of serving the error from the 6h cache', async () => {
    // Regression for the homepage tarpit outage: a stalled TMDB upstream
    // surfaces as 504 -> 502, and the cached handler must not pin that
    // error payload. The retry refetches and serves the live payload.
    fakeClient.discover.mockRejectedValueOnce(new TmdbApiError(504))
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    const failed = await call(new Request('http://localhost/api/catalog/discover?kind=movie&genres=28&language=en'))
    expect(failed.status).toBe(502)

    const retried = await call(new Request('http://localhost/api/catalog/discover?kind=movie&genres=28&language=en'))
    expect(retried.status).toBe(200)
    expect(fakeClient.discover).toHaveBeenCalledTimes(2)
  })

  it('leaves non-5xx upstream client errors untouched', async () => {
    fakeClient.discover.mockRejectedValue(new TmdbApiError(400))

    const response = await call(new Request('http://localhost/api/catalog/discover?kind=movie'))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ statusCode: 400 })
  })

  it('serves a repeat filtered visit from the 6h cache without hitting TMDB again', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    const first = await call(new Request('http://localhost/api/catalog/discover?kind=movie&genres=28&language=en'))
    const second = await call(new Request('http://localhost/api/catalog/discover?kind=movie&genres=28&language=en'))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual(await first.json())
    expect(fakeClient.discover).toHaveBeenCalledTimes(1)
  })

  it('keys the cache by region so a region switch refetches provider-filtered discover', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/discover?kind=movie&providers=8&language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    await call(new Request('http://localhost/api/catalog/discover?kind=movie&providers=8&language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    expect(fakeClient.discover).toHaveBeenCalledTimes(1)

    await call(new Request('http://localhost/api/catalog/discover?kind=movie&providers=8&language=en', { headers: { 'cf-ipcountry': 'US' } }))
    expect(fakeClient.discover).toHaveBeenCalledTimes(2)
  })

  it('keeps the varies headers visible to the handler so a cached region key discovers with the same watchRegion', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/discover?kind=movie&providers=8&language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    await call(new Request('http://localhost/api/catalog/discover?kind=movie&providers=8&language=en', { headers: { 'cf-ipcountry': 'US' } }))

    expect(fakeClient.discover).toHaveBeenCalledTimes(2)
    expect(fakeClient.discover).toHaveBeenLastCalledWith('MOVIE', expect.objectContaining({
      providerIds: [8],
      watchRegion: 'US',
    }))
  })

  it('emits a 6h max-age cache-control so browsers keep filtered results on disk', async () => {
    fakeClient.discover.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    const response = await call(new Request('http://localhost/api/catalog/discover?kind=movie&genres=28&language=en'))

    expect(response.headers.get('cache-control')).toContain('max-age=21600')
  })
})

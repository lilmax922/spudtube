import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  searchMulti: vi.fn(),
}))

vi.mock('../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./search.get')).default

describe('gET /api/catalog/search', () => {
  const router = createRouter()
  router.get('/api/catalog/search', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.searchMulti.mockReset()
  })

  it('delegates to multi-search with validated params, resolving TW geo to zh-TW', async () => {
    fakeClient.searchMulti.mockResolvedValue({ page: 3, results: [], totalPages: 9, totalResults: 87 })

    const response = await call(new Request('http://localhost/api/catalog/search?query=dune&page=3', {
      headers: { 'cf-ipcountry': 'TW' },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.searchMulti).toHaveBeenCalledWith('dune', 3, 'zh-TW')
    expect(body).toEqual({ page: 3, results: [], totalPages: 9, totalResults: 87 })
  })

  it('forwards the requested language to the client', async () => {
    fakeClient.searchMulti.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    const response = await call(new Request('http://localhost/api/catalog/search?query=dune&language=en'))
    await response.json()

    expect(fakeClient.searchMulti).toHaveBeenCalledWith('dune', 1, 'en')
  })

  it('auto-detects en when no geo or cookie, and cookie overrides geo', async () => {
    fakeClient.searchMulti.mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })

    await call(new Request('http://localhost/api/catalog/search?query=dune'))
    expect(fakeClient.searchMulti).toHaveBeenLastCalledWith('dune', 1, 'en')

    fakeClient.searchMulti.mockClear()
    await call(new Request('http://localhost/api/catalog/search?query=dune', {
      headers: { 'cf-ipcountry': 'US' },
    }))
    expect(fakeClient.searchMulti).toHaveBeenLastCalledWith('dune', 1, 'en')

    fakeClient.searchMulti.mockClear()
    await call(new Request('http://localhost/api/catalog/search?query=dune', {
      headers: { 'cf-ipcountry': 'TW', 'cookie': 'spudtube-locale=en' },
    }))
    expect(fakeClient.searchMulti).toHaveBeenLastCalledWith('dune', 1, 'en')

    fakeClient.searchMulti.mockClear()
    await call(new Request('http://localhost/api/catalog/search?query=dune', {
      headers: { 'cf-ipcountry': 'US', 'cookie': 'spudtube-locale=zh-TW' },
    }))
    expect(fakeClient.searchMulti).toHaveBeenLastCalledWith('dune', 1, 'zh-TW')
  })

  it('rejects an empty query with 400 and flattened issues', async () => {
    const response = await call(new Request('http://localhost/api/catalog/search?query='))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.statusCode).toBe(400)
    expect(body.data?.issues).toMatchObject({ fieldErrors: { query: expect.any(Array) } })
    expect(fakeClient.searchMulti).not.toHaveBeenCalled()
  })
})

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

  it('delegates to multi-search with validated params', async () => {
    fakeClient.searchMulti.mockResolvedValue({ page: 3, results: [], totalPages: 9, totalResults: 87 })

    const response = await call(new Request('http://localhost/api/catalog/search?query=dune&page=3'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.searchMulti).toHaveBeenCalledWith('dune', 3)
    expect(body).toEqual({ page: 3, results: [], totalPages: 9, totalResults: 87 })
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

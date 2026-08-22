import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  watchProviders: vi.fn(),
}))

vi.mock('../../../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./providers.get')).default

describe('gET /api/catalog/:kind/:id/providers', () => {
  const router = createRouter()
  router.get('/api/catalog/:kind/:id/providers', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.watchProviders.mockReset()
  })

  it('returns the provider catalog for all regions', async () => {
    const catalog = {
      TW: {
        link: 'https://www.themoviedb.org/movie/419430/watch?locale=TW',
        groups: { subscription: [], free: [], rent: [], buy: [] },
      },
    }
    fakeClient.watchProviders.mockResolvedValue(catalog)

    const response = await call(new Request('http://localhost/api/catalog/movie/419430/providers'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.watchProviders).toHaveBeenCalledWith('MOVIE', 419430)
    expect(body).toEqual(catalog)
  })
})

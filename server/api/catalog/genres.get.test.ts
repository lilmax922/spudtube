import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  genres: vi.fn(),
}))

vi.mock('../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./genres.get')).default

describe('gET /api/catalog/genres', () => {
  const router = createRouter()
  router.get('/api/catalog/genres', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.genres.mockReset()
  })

  it('lists genres for the requested kind', async () => {
    fakeClient.genres.mockResolvedValue([{ id: 878, name: '科幻' }])

    const response = await call(new Request('http://localhost/api/catalog/genres?kind=movie'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.genres).toHaveBeenCalledWith('MOVIE')
    expect(body).toEqual([{ id: 878, name: '科幻' }])
  })

  it('rejects a missing kind', async () => {
    const response = await call(new Request('http://localhost/api/catalog/genres'))

    expect(response.status).toBe(400)
    expect(fakeClient.genres).not.toHaveBeenCalled()
  })
})

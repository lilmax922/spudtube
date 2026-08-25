import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  title: vi.fn(),
}))

vi.mock('../../../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./index.get')).default

describe('gET /api/catalog/:kind/:id', () => {
  const router = createRouter()
  router.get('/api/catalog/:kind/:id', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.title.mockReset()
  })

  it('returns the mapped title detail, resolving TW geo to zh-TW', async () => {
    fakeClient.title.mockResolvedValue({ kind: 'MOVIE', tmdbId: 419430, name: '沙丘' })

    const response = await call(new Request('http://localhost/api/catalog/movie/419430', {
      headers: { 'cf-ipcountry': 'TW' },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(fakeClient.title).toHaveBeenCalledWith('MOVIE', 419430, 'zh-TW')
    expect(body).toEqual({ kind: 'MOVIE', tmdbId: 419430, name: '沙丘' })
  })

  it('forwards language for title detail', async () => {
    fakeClient.title.mockResolvedValue(null)

    await call(new Request('http://localhost/api/catalog/tv/94605?language=en'))

    expect(fakeClient.title).toHaveBeenCalledWith('TV_SHOW', 94605, 'en')
  })

  it('auto-detects en without geo and respects cookie override', async () => {
    fakeClient.title.mockResolvedValue(null)

    await call(new Request('http://localhost/api/catalog/movie/419430'))
    expect(fakeClient.title).toHaveBeenLastCalledWith('MOVIE', 419430, 'en')

    fakeClient.title.mockClear()
    await call(new Request('http://localhost/api/catalog/movie/419430', {
      headers: { 'cf-ipcountry': 'TW', 'cookie': 'spudtube-locale=en' },
    }))
    expect(fakeClient.title).toHaveBeenLastCalledWith('MOVIE', 419430, 'en')
  })

  it('rejects a non-numeric id', async () => {
    const response = await call(new Request('http://localhost/api/catalog/movie/not-a-number'))

    expect(response.status).toBe(400)
    expect(fakeClient.title).not.toHaveBeenCalled()
  })
})

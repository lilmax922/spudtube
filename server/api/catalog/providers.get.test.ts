import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  watchProviders: vi.fn(),
}))

vi.mock('../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./providers.get')).default

describe('gET /api/catalog/providers', () => {
  const router = createRouter()
  router.get('/api/catalog/providers', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.watchProviders.mockReset()
  })

  it('returns a map of tmdbId to providers for the requested region', async () => {
    fakeClient.watchProviders.mockImplementation(async (_kind: 'MOVIE', id: number) => {
      if (id === 1) {
        return {
          TW: {
            link: null,
            groups: {
              subscription: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }],
              free: [],
              rent: [],
              buy: [],
            },
          },
        }
      }
      return {
        TW: {
          link: null,
          groups: {
            subscription: [{ id: 119, name: 'Prime Video', logoPath: '/p.jpg' }],
            free: [],
            rent: [],
            buy: [],
          },
        },
      }
    })

    const response = await call(
      new Request('http://localhost/api/catalog/providers?kind=movie&ids=1,2', {
        headers: { 'cf-ipcountry': 'TW' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      1: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }],
      2: [{ id: 119, name: 'Prime Video', logoPath: '/p.jpg' }],
    })
  })

  it('returns an empty list for titles without a region entry', async () => {
    fakeClient.watchProviders.mockResolvedValue({})

    const response = await call(
      new Request('http://localhost/api/catalog/providers?kind=movie&ids=42', {
        headers: { 'cf-ipcountry': 'TW' },
      }),
    )
    const body = await response.json()

    expect(body).toEqual({ 42: [] })
  })

  it('still returns a row when watchProviders throws for one title', async () => {
    fakeClient.watchProviders.mockImplementation(async (_kind: 'MOVIE', id: number) => {
      if (id === 1)
        throw new Error('boom')
      return {
        TW: {
          link: null,
          groups: {
            subscription: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }],
            free: [],
            rent: [],
            buy: [],
          },
        },
      }
    })

    const response = await call(
      new Request('http://localhost/api/catalog/providers?kind=movie&ids=1,2'),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      1: [],
      2: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }],
    })
  })

  it('rejects malformed ids', async () => {
    const response = await call(
      new Request('http://localhost/api/catalog/providers?kind=movie&ids=abc'),
    )

    expect(response.status).toBe(400)
    expect(fakeClient.watchProviders).not.toHaveBeenCalled()
  })

  it('rejects an unknown kind', async () => {
    const response = await call(
      new Request('http://localhost/api/catalog/providers?kind=book&ids=1'),
    )

    expect(response.status).toBe(400)
    expect(fakeClient.watchProviders).not.toHaveBeenCalled()
  })
})

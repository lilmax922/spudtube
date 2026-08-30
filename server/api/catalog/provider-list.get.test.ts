import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  watchProviderList: vi.fn(),
}))

vi.mock('../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./provider-list.get')).default

describe('gET /api/catalog/provider-list', () => {
  const router = createRouter()
  router.get('/api/catalog/provider-list', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  const allProviders = [
    { id: 8, name: 'Netflix', logoPath: '/n.jpg', displayPriority: 1 },
    { id: 2, name: 'Apple TV', logoPath: '/a.jpg', displayPriority: 2 },
    { id: 337, name: 'Disney Plus', logoPath: '/d.jpg', displayPriority: 3 },
    { id: 119, name: 'Amazon Prime Video', logoPath: '/p.jpg', displayPriority: 4 },
    { id: 350, name: 'Apple TV Plus', logoPath: '/ap.jpg', displayPriority: 5 },
  ]

  afterEach(() => {
    fakeClient.watchProviderList.mockReset()
  })

  it('matches appletv to Apple TV via normalized search (space/punctuation-insensitive)', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=appletv'))
    const body = await response.json() as typeof allProviders

    expect(response.status).toBe(200)
    expect(body.map(p => p.name)).toContain('Apple TV')
    expect(body.map(p => p.name)).toContain('Apple TV Plus')
  })

  it('matches disneyplus to Disney Plus', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=disneyplus'))
    const body = await response.json() as typeof allProviders

    expect(response.status).toBe(200)
    expect(body.map(p => p.name)).toContain('Disney Plus')
  })

  it('matches prime to Amazon Prime Video', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=prime'))
    const body = await response.json() as typeof allProviders

    expect(response.status).toBe(200)
    expect(body.map(p => p.name)).toContain('Amazon Prime Video')
  })

  it('is case-insensitive and trims whitespace', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=%20ApPleTv%20'))
    const body = await response.json() as typeof allProviders

    expect(response.status).toBe(200)
    expect(body.map(p => p.name)).toContain('Apple TV')
  })

  it('returns popular slice sorted by displayPriority when popular=1', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&popular=1'))
    const body = await response.json() as typeof allProviders

    expect(response.status).toBe(200)
    expect(body[0]?.name).toBe('Netflix')
    expect(body.length).toBeLessThanOrEqual(12)
  })

  it('returns alphabetical full list when no flags', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie'))
    const body = await response.json() as typeof allProviders

    expect(response.status).toBe(200)
    expect(body.map(p => p.name)).toEqual([...allProviders].sort((a, b) => a.name.localeCompare(b.name)).map(p => p.name))
  })
})

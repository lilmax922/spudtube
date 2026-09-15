import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { __resetNitropackRuntimeCache } from '../../../vitest.stubs/nitropack-runtime'

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
    __resetNitropackRuntimeCache()
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

  it('serves a repeat visit from the 6h cache without hitting TMDB again', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const first = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&language=en'))
    const second = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&language=en'))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual(await first.json())
    expect(fakeClient.watchProviderList).toHaveBeenCalledTimes(1)
  })

  it('keys the cache by region so a region switch refetches the list', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    expect(fakeClient.watchProviderList).toHaveBeenCalledTimes(1)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&language=en', { headers: { 'cf-ipcountry': 'US' } }))
    expect(fakeClient.watchProviderList).toHaveBeenCalledTimes(2)
  })

  it('declares cookie and cf-ipcountry as cache varies so the handler resolves the keyed region', async () => {
    const fs = await import('node:fs')
    const source = fs.readFileSync(`${process.cwd()}/server/api/catalog/provider-list.get.ts`, 'utf-8')
    expect(source).toMatch(/varies:\s*\[.*cookie.*cf-ipcountry.*\]/s)
  })

  it('bypasses the cache for typed search so keystrokes always hit fresh data', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=apple'))
    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=apple'))

    expect(fakeClient.watchProviderList).toHaveBeenCalledTimes(2)
  })

  it('emits a 6h max-age cache-control so browsers keep the list on disk', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie'))

    expect(response.headers.get('cache-control')).toContain('max-age=21600')
  })
})

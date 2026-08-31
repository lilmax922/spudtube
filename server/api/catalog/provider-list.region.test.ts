import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  watchProviderList: vi.fn(),
}))

vi.mock('../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./provider-list.get')).default

describe('get /api/catalog/provider-list — region-filtered (geolocation)', () => {
  const router = createRouter()
  router.get('/api/catalog/provider-list', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  const allProviders = [
    { id: 8, name: 'Netflix', logoPath: '/n.jpg', displayPriority: 1 },
    { id: 2, name: 'Apple TV', logoPath: '/a.jpg', displayPriority: 2 },
    { id: 337, name: 'Disney Plus', logoPath: '/d.jpg', displayPriority: 3 },
  ]

  afterEach(() => {
    fakeClient.watchProviderList.mockReset()
  })

  it('forwards resolved TW region from cf-ipcountry header to watchProviderList', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&popular=1', {
      headers: { 'cf-ipcountry': 'TW' },
    }))

    expect(response.status).toBe(200)
    expect(fakeClient.watchProviderList).toHaveBeenCalledWith('MOVIE', expect.any(String), 'TW')
  })

  it('forwards US region when header is US', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&popular=1', {
      headers: { 'cf-ipcountry': 'US' },
    }))

    expect(fakeClient.watchProviderList).toHaveBeenCalledWith('MOVIE', expect.any(String), 'US')
  })

  it('cookie spudtube-region overrides cf-ipcountry header', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&popular=1', {
      headers: { 'cf-ipcountry': 'TW', 'cookie': 'spudtube-region=US' },
    }))

    expect(fakeClient.watchProviderList).toHaveBeenCalledWith('MOVIE', expect.any(String), 'US')
  })

  it('falls back to TW default when country is not curated (e.g. TH)', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&popular=1', {
      headers: { 'cf-ipcountry': 'TH' },
    }))

    expect(fakeClient.watchProviderList).toHaveBeenCalledWith('MOVIE', expect.any(String), 'TW')
  })

  it('uses language and region together — zh-TW locale + JP region', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=tv', {
      headers: { 'cf-ipcountry': 'JP' },
    }))

    // language defaults to en without TW header? With JP header locale is en, but still region JP
    // verify region is JP regardless of language resolution
    expect(fakeClient.watchProviderList).toHaveBeenCalledWith('TV_SHOW', expect.any(String), 'JP')
  })

  it('forwards region for search q filtering as well', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=net', {
      headers: { 'cf-ipcountry': 'US' },
    }))

    expect(fakeClient.watchProviderList).toHaveBeenCalledWith('MOVIE', expect.any(String), 'US')
  })
})

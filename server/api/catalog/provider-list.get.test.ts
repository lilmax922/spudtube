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

  it('keeps the varies headers visible to the handler so a cached region key resolves the same region upstream', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&language=en', { headers: { 'cf-ipcountry': 'TW' } }))
    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&language=en', { headers: { 'cf-ipcountry': 'US' } }))

    expect(fakeClient.watchProviderList).toHaveBeenCalledTimes(2)
    expect(fakeClient.watchProviderList).toHaveBeenLastCalledWith('MOVIE', 'en', 'US')
  })

  it('bypasses the cache for typed search so keystrokes always hit fresh data', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=apple'))
    await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&q=apple'))

    expect(fakeClient.watchProviderList).toHaveBeenCalledTimes(2)
  })

  it('emits s-maxage plus a day of stale-while-revalidate so downstream caches serve stale during an outage', async () => {
    fakeClient.watchProviderList.mockResolvedValue(allProviders)

    const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie'))

    expect(response.headers.get('cache-control')).toContain('s-maxage=21600')
    expect(response.headers.get('cache-control')).toContain('stale-while-revalidate=86400')
  })

  it('serves the stale provider list while TMDB stalls past entry expiry, then heals once TMDB recovers', async () => {
    // Same PR70 source fix as the hero stale test: an expired 6h entry must
    // not block the filter bar on a stalled upstream. Date is faked for the
    // 6h time travel but timers stay real so h3 can settle each request.
    vi.useFakeTimers({ toFake: ['Date'] })
    const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
    try {
      fakeClient.watchProviderList.mockResolvedValue(allProviders)

      const first = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&popular=1'))
      expect(first.status).toBe(200)
      const warmBody = await first.json()

      vi.setSystemTime(Date.now() + 21601 * 1000)
      let listCalls = 0
      let rejectStalled: ((error: unknown) => void) | undefined
      fakeClient.watchProviderList.mockImplementation(() => {
        listCalls++
        return new Promise((_resolve, reject) => {
          rejectStalled = reject
        })
      })

      const stalled = await Promise.race([
        call(new Request('http://localhost/api/catalog/provider-list?kind=movie&popular=1')).then(async response => ({ status: response.status, body: await response.json() })),
        sleep(1000).then(() => 'TIMEOUT' as const),
      ])
      expect(stalled).not.toBe('TIMEOUT')
      expect(stalled).toEqual({ status: 200, body: warmBody })
      expect(listCalls).toBe(1)

      const freshProviders = [{ id: 999, name: 'Fresh Flix', logoPath: '/f.jpg', displayPriority: 0 }]
      fakeClient.watchProviderList.mockResolvedValue(freshProviders)
      rejectStalled?.(new Error('TMDB request timeout after 10000ms'))
      await sleep(20)
      const healed = await (async () => {
        const deadline = Date.now() + 5000
        for (;;) {
          const response = await call(new Request('http://localhost/api/catalog/provider-list?kind=movie&popular=1'))
          const body = await response.json() as { id?: number }[]
          if (body[0]?.id === 999 || Date.now() > deadline)
            return { status: response.status, body }
          await sleep(20)
        }
      })()
      expect(healed.status).toBe(200)
      expect(healed.body).toMatchObject([{ id: 999 }])
    }
    finally {
      vi.useRealTimers()
    }
  })
})

import { describe, expect, it } from 'vitest'
import { createTmdbClient } from './client'
import { createFakeTransport } from './fake-transport'

describe('tmdb client — watchProviderList region filtering', () => {
  it('sends watch_region param when region is provided', async () => {
    const fakeData = { results: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 0 }] }
    const { fetchJson, requests } = createFakeTransport({
      '/3/watch/providers/movie': fakeData,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.watchProviderList('MOVIE', 'en', 'US')

    expect(requests[0]?.params.watch_region).toBe('US')
    expect(requests[0]?.params.language).toBe('en')
  })

  it('omits watch_region when no region provided (global)', async () => {
    const fakeData = { results: [] }
    const { fetchJson, requests } = createFakeTransport({
      '/3/watch/providers/movie': fakeData,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.watchProviderList('MOVIE', 'en')

    expect(requests[0]?.params.watch_region).toBeUndefined()
  })

  it('caches separately per region', async () => {
    const fakeData = { results: [] }
    const { fetchJson, requests } = createFakeTransport({
      '/3/watch/providers/movie': fakeData,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.watchProviderList('MOVIE', 'en', 'TW')
    await client.watchProviderList('MOVIE', 'en', 'TW')
    expect(requests).toHaveLength(1)

    await client.watchProviderList('MOVIE', 'en', 'US')
    expect(requests).toHaveLength(2)

    await client.watchProviderList('MOVIE', 'zh-TW', 'US')
    expect(requests).toHaveLength(3)
  })

  it('sends watch_region for TV kind as well', async () => {
    const fakeData = { results: [] }
    const { fetchJson, requests } = createFakeTransport({
      '/3/watch/providers/tv': fakeData,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.watchProviderList('TV_SHOW', 'zh-TW', 'TW')

    expect(requests[0]?.url).toBe('https://api.themoviedb.org/3/watch/providers/tv')
    expect(requests[0]?.params.watch_region).toBe('TW')
  })
})

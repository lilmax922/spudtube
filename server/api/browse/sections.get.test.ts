import type { TitleSummary } from '../../tmdb/types'
import { createApp, createRouter, toWebHandler } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fakeClient = vi.hoisted(() => ({
  trending: vi.fn(),
  topRated: vi.fn(),
  popular: vi.fn(),
  discover: vi.fn(),
}))

vi.mock('../../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const handler = (await import('./sections.get')).default

function makeTitles(count: number, seed = 1): TitleSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    kind: 'MOVIE' as const,
    tmdbId: seed + index,
    name: `Title ${seed + index}`,
    posterPath: `/poster-${seed + index}.jpg`,
    backdropPath: null,
    releaseDate: '2024-01-01',
    voteAverage: 7.5,
    genreIds: [],
    overview: null,
  }))
}

describe('gET /api/browse/sections', () => {
  const router = createRouter()
  router.get('/api/browse/sections', handler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  afterEach(() => {
    fakeClient.trending.mockReset()
    fakeClient.topRated.mockReset()
    fakeClient.popular.mockReset()
    fakeClient.discover.mockReset()
  })

  it('returns every movie row in one response with title keys', async () => {
    fakeClient.trending.mockResolvedValue({ page: 1, results: makeTitles(10, 1), totalPages: 1, totalResults: 10 })
    fakeClient.discover.mockResolvedValue({ page: 1, results: makeTitles(10, 101), totalPages: 1, totalResults: 10 })

    const response = await call(
      new Request('http://localhost/api/browse/sections?kind=movie', {
        headers: { 'cf-ipcountry': 'TW' },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.kind).toBe('movie')
    expect(body.sections).toHaveLength(6)
    for (const section of body.sections) {
      expect(section.key).toMatch(/^movie\./)
      expect(section.titleKey).toMatch(/^browse\.sections\./)
      expect(section.titles.length).toBeGreaterThanOrEqual(8)
    }
    expect(fakeClient.trending).toHaveBeenCalledWith('MOVIE', 1, 'zh-TW', 'week')
  })

  it('returns the tv rows when switching kind', async () => {
    fakeClient.trending.mockResolvedValue({ page: 1, results: makeTitles(10, 1), totalPages: 1, totalResults: 10 })
    fakeClient.topRated.mockResolvedValue({ page: 1, results: makeTitles(10, 51), totalPages: 1, totalResults: 10 })
    fakeClient.discover.mockImplementation(async () => ({ page: 1, results: makeTitles(10, 101), totalPages: 1, totalResults: 10 }))

    const response = await call(new Request('http://localhost/api/browse/sections?kind=tv&language=en'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.kind).toBe('tv')
    expect(body.sections).toHaveLength(6)
    for (const section of body.sections)
      expect(section.key).toMatch(/^tv\./)
    expect(fakeClient.trending).toHaveBeenCalledWith('TV_SHOW', 1, 'en', 'week')
    expect(fakeClient.topRated).toHaveBeenCalledWith('TV_SHOW', 1, 'en')
  })

  it('forwards an explicit language to every row query', async () => {
    fakeClient.trending.mockResolvedValue({ page: 1, results: makeTitles(10, 1), totalPages: 1, totalResults: 10 })
    fakeClient.discover.mockResolvedValue({ page: 1, results: makeTitles(10, 101), totalPages: 1, totalResults: 10 })

    await call(new Request('http://localhost/api/browse/sections?kind=movie&language=en'))

    expect(fakeClient.discover).toHaveBeenCalledWith('MOVIE', expect.objectContaining({ language: 'en', page: 1 }))
  })

  it('hides rows with fewer titles than one carousel page', async () => {
    fakeClient.trending.mockResolvedValue({ page: 1, results: makeTitles(10, 1), totalPages: 1, totalResults: 10 })
    fakeClient.discover.mockImplementation(async (_kind: unknown, options: { genreIds?: number[] }) => {
      // Horror row (genre 27) comes back thin; every other row is full.
      const results = options?.genreIds?.includes(27) ? makeTitles(3, 201) : makeTitles(10, 101)
      return { page: 1, results, totalPages: 1, totalResults: results.length }
    })

    const response = await call(new Request('http://localhost/api/browse/sections?kind=movie&language=en'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.sections).toHaveLength(5)
    expect(body.sections.map((section: { key: string }) => section.key)).not.toContain('movie.horror')
  })

  it('omits a single failing row while the rest still return', async () => {
    fakeClient.trending.mockRejectedValue(new Error('upstream hiccup'))
    fakeClient.discover.mockResolvedValue({ page: 1, results: makeTitles(10, 101), totalPages: 1, totalResults: 10 })

    const response = await call(new Request('http://localhost/api/browse/sections?kind=movie&language=en'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.sections).toHaveLength(5)
    expect(body.sections.map((section: { key: string }) => section.key)).not.toContain('movie.trending')
  })

  it('rejects an unknown kind', async () => {
    const response = await call(new Request('http://localhost/api/browse/sections?kind=book'))

    expect(response.status).toBe(400)
    expect(fakeClient.trending).not.toHaveBeenCalled()
    expect(fakeClient.discover).not.toHaveBeenCalled()
  })
})

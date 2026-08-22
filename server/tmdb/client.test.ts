import type { FetchJson } from './client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTmdbClient, TmdbApiError } from './client'
import {
  DETAIL_TTL_MS,
  NOT_FOUND_TTL_MS,
  SEARCH_TTL_MS,
} from './constants'
import { createFakeTransport } from './fake-transport'

const SEARCH_MULTI_PAGE = {
  page: 1,
  total_pages: 5,
  total_results: 87,
  results: [
    {
      media_type: 'movie',
      id: 419430,
      title: 'Dune',
      overview: 'Paul Atreides，亞崔迪家族的繼承人…',
      poster_path: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
      backdrop_path: '/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
      release_date: '2021-10-22',
      vote_average: 7.805,
    },
    {
      media_type: 'person',
      id: 90633,
      name: 'Rebecca Ferguson',
      profile_path: '/9Cq5OJ2rNQ9HhVdKZJ9hF3S2m.jpg',
    },
    {
      media_type: 'tv',
      id: 93405,
      name: '沙丘：預言',
      overview: '萬年前的姊妹會故事。',
      poster_path: '/pRq2nCbH0POJKPZwuw9a0fztMPl.jpg',
      backdrop_path: null,
      first_air_date: '2024-11-17',
      vote_average: 0.714,
    },
  ],
}

describe('tmdb client — searchMulti', () => {
  it('queries multi-search and maps results to canonical Kinds, dropping people', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/search/multi': SEARCH_MULTI_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.searchMulti('dune', 1)

    expect(requests).toEqual([
      {
        url: 'https://api.themoviedb.org/3/search/multi',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
        params: {
          query: 'dune',
          page: '1',
          language: 'zh-TW',
          include_adult: 'false',
        },
      },
    ])
    expect(page).toEqual({
      page: 1,
      totalPages: 5,
      totalResults: 87,
      results: [
        {
          kind: 'MOVIE',
          tmdbId: 419430,
          name: 'Dune',
          posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
          backdropPath: '/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
          releaseDate: '2021-10-22',
          voteAverage: 7.805,
        },
        {
          kind: 'TV_SHOW',
          tmdbId: 93405,
          name: '沙丘：預言',
          posterPath: '/pRq2nCbH0POJKPZwuw9a0fztMPl.jpg',
          backdropPath: null,
          releaseDate: '2024-11-17',
          voteAverage: 0.714,
        },
      ],
    })
  })

  it('defaults to page 1 when omitted', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/search/multi': SEARCH_MULTI_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.searchMulti('dune')

    expect(requests[0]?.params.page).toBe('1')
  })
})

const DISCOVER_MOVIE_PAGE = {
  page: 1,
  total_pages: 100,
  total_results: 19_542,
  results: [
    {
      id: 693134,
      title: '沙丘：第二部',
      poster_path: '/1pdfLUkbDBtcDQNkh0Zkwv6hrvb.jpg',
      backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
      release_date: '2024-02-27',
      vote_average: 8.12,
    },
  ],
}

const DISCOVER_TV_PAGE = {
  page: 1,
  total_pages: 50,
  total_results: 987,
  results: [
    {
      id: 94605,
      name: 'Arcane',
      poster_path: '/fqldf2tl8bJQXgaXnA9tw6pbRns.jpg',
      backdrop_path: '/6TLvNexZw9mNyTOVTHZOLripeLy.jpg',
      first_air_date: '2021-11-06',
      vote_average: 8.7,
    },
  ],
}

describe('tmdb client — discover', () => {
  it('discovers movies by genres and popularity', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.discover('MOVIE', { genreIds: [878, 35], page: 2 })

    expect(requests[0]).toEqual({
      url: 'https://api.themoviedb.org/3/discover/movie',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      params: {
        sort_by: 'popularity.desc',
        with_genres: '878,35',
        page: '2',
        language: 'zh-TW',
      },
    })
    expect(page.results).toEqual([
      {
        kind: 'MOVIE',
        tmdbId: 693134,
        name: '沙丘：第二部',
        posterPath: '/1pdfLUkbDBtcDQNkh0Zkwv6hrvb.jpg',
        backdropPath: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
        releaseDate: '2024-02-27',
        voteAverage: 8.12,
      },
    ])
  })

  it('discovers tv shows without genre filter', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/tv': DISCOVER_TV_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.discover('TV_SHOW')

    expect(requests[0]?.url).toBe('https://api.themoviedb.org/3/discover/tv')
    expect(requests[0]?.params).toEqual({ sort_by: 'popularity.desc', page: '1', language: 'zh-TW' })
    expect(page.results[0]).toMatchObject({ kind: 'TV_SHOW', tmdbId: 94605, name: 'Arcane' })
  })
})

const MOVIE_DETAIL = {
  id: 419430,
  title: '沙丘',
  overview: '天賦異稟的保羅·亞崔迪…',
  tagline: '超越即將來臨。',
  poster_path: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
  backdrop_path: '/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
  release_date: '2021-10-22',
  vote_average: 7.805,
  runtime: 155,
  genres: [
    { id: 878, name: '科幻' },
    { id: 12, name: '冒險' },
  ],
  videos: {
    results: [
      { key: 'teaserKey1', site: 'YouTube', type: 'Teaser', official: true, iso_639_1: 'en' },
      { key: 'enTrailerKey', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en' },
      { key: 'zhTrailerKey', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'zh' },
    ],
  },
}

const TV_DETAIL = {
  id: 94605,
  name: '奧術',
  overview: '在烏托邦皮爾特沃夫…',
  tagline: null,
  poster_path: '/fqldf2tl8bJQXgaXnA9tw6pbRns.jpg',
  backdrop_path: '/6TLvNexZw9mNyTOVTHZOLripeLy.jpg',
  first_air_date: '2021-11-06',
  vote_average: 8.7,
  episode_run_time: [42],
  genres: [
    { id: 16, name: '動畫' },
    { id: 10765, name: '科幻與奇幻' },
  ],
}

const MOVIE_DETAIL_UNTRANSLATED = {
  id: 999001,
  title: 'Untranslated Film',
  overview: '',
  tagline: '',
  poster_path: null,
  backdrop_path: null,
  release_date: '',
  vote_average: 5.5,
  runtime: 90,
  genres: [],
  translations: {
    translations: [
      {
        iso_639_1: 'zh',
        iso_3166_1: 'TW',
        data: { overview: '', tagline: '' },
      },
      {
        iso_639_1: 'en',
        iso_3166_1: 'US',
        data: { overview: 'An English overview for an untranslated film.', tagline: '' },
      },
    ],
  },
}

describe('tmdb client — title detail', () => {
  it('fetches movie detail with videos and translations appended', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/movie/419430': MOVIE_DETAIL,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const detail = await client.title('MOVIE', 419430)

    expect(requests[0]).toEqual({
      url: 'https://api.themoviedb.org/3/movie/419430',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      params: { language: 'zh-TW', append_to_response: 'videos,translations' },
    })
    expect(detail).toEqual({
      kind: 'MOVIE',
      tmdbId: 419430,
      name: '沙丘',
      posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
      backdropPath: '/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
      releaseDate: '2021-10-22',
      voteAverage: 7.805,
      overview: '天賦異稟的保羅·亞崔迪…',
      tagline: '超越即將來臨。',
      genres: [
        { id: 878, name: '科幻' },
        { id: 12, name: '冒險' },
      ],
      runtimeMinutes: 155,
      trailerKey: 'zhTrailerKey',
    })
  })

  it('maps tv detail from tv-shaped fields', async () => {
    const { fetchJson } = createFakeTransport({
      '/3/tv/94605': TV_DETAIL,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const detail = await client.title('TV_SHOW', 94605)

    expect(detail).toMatchObject({
      kind: 'TV_SHOW',
      tmdbId: 94605,
      name: '奧術',
      releaseDate: '2021-11-06',
      runtimeMinutes: 42,
      trailerKey: null,
    })
  })

  it('falls back to the English overview when the localized one is empty', async () => {
    const { fetchJson } = createFakeTransport({
      '/3/movie/999001': MOVIE_DETAIL_UNTRANSLATED,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const detail = await client.title('MOVIE', 999001)

    expect(detail?.overview).toBe('An English overview for an untranslated film.')
  })

  it('returns null when the title no longer exists upstream', async () => {
    const fetchJson: FetchJson = async () => {
      throw new TmdbApiError(404, 'The resource you requested could not be found.')
    }
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await expect(client.title('MOVIE', 404404)).resolves.toBeNull()
  })
})

const MOVIE_PROVIDERS = {
  id: 419430,
  results: {
    TW: {
      link: 'https://www.themoviedb.org/movie/419430/watch?locale=TW',
      flatrate: [
        { provider_id: 8, provider_name: 'HBO Max', logo_path: '/Aa9Qfx6Kj.jpg', display_priority: 3 },
      ],
      rent: [
        { provider_id: 2, provider_name: 'Apple TV', logo_path: '/peURlLrx8q.jpg', display_priority: 12 },
      ],
    },
    US: {
      link: 'https://www.themoviedb.org/movie/419430/watch?locale=US',
      free: [
        { provider_id: 257, provider_name: 'fuboTV', logo_path: '/hSx1XVkB.jpg', display_priority: 5 },
      ],
      buy: [
        { provider_id: 2, provider_name: 'Apple TV', logo_path: '/peURlLrx8q.jpg', display_priority: 12 },
      ],
    },
  },
}

describe('tmdb client — watch providers', () => {
  it('groups provider tiers per region with canonical tier names', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/movie/419430/watch/providers': MOVIE_PROVIDERS,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const catalog = await client.watchProviders('MOVIE', 419430)

    expect(requests[0]?.url).toBe('https://api.themoviedb.org/3/movie/419430/watch/providers')
    expect(catalog).toEqual({
      TW: {
        link: 'https://www.themoviedb.org/movie/419430/watch?locale=TW',
        groups: {
          subscription: [{ id: 8, name: 'HBO Max', logoPath: '/Aa9Qfx6Kj.jpg' }],
          free: [],
          rent: [{ id: 2, name: 'Apple TV', logoPath: '/peURlLrx8q.jpg' }],
          buy: [],
        },
      },
      US: {
        link: 'https://www.themoviedb.org/movie/419430/watch?locale=US',
        groups: {
          subscription: [],
          free: [{ id: 257, name: 'fuboTV', logoPath: '/hSx1XVkB.jpg' }],
          rent: [],
          buy: [{ id: 2, name: 'Apple TV', logoPath: '/peURlLrx8q.jpg' }],
        },
      },
    })
  })
})

const TV_RECOMMENDATIONS_PAGE = {
  page: 1,
  total_pages: 3,
  total_results: 55,
  results: [
    {
      id: 135431,
      name: '最後生還者',
      poster_path: '/uC6SNHt5DdzDJKRzjUx0OJcA9fi.jpg',
      backdrop_path: '/6QR1LRmOsQmIXfcYw7Pg7P0RPBq.jpg',
      first_air_date: '2023-01-15',
      vote_average: 8.5,
    },
  ],
}

const MOVIE_GENRES = {
  genres: [
    { id: 28, name: '動作' },
    { id: 878, name: '科幻' },
  ],
}

describe('tmdb client — recommendations', () => {
  it('fetches paged recommendations for a title', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/tv/94605/recommendations': TV_RECOMMENDATIONS_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.recommendations('TV_SHOW', 94605, 2)

    expect(requests[0]).toEqual({
      url: 'https://api.themoviedb.org/3/tv/94605/recommendations',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      params: { page: '2', language: 'zh-TW' },
    })
    expect(page.results[0]).toMatchObject({ kind: 'TV_SHOW', tmdbId: 135431, name: '最後生還者' })
    expect(page.totalPages).toBe(3)
  })
})

describe('tmdb client — genres', () => {
  it('lists genres for each kind from its own endpoint', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/genre/movie/list': MOVIE_GENRES,
      '/3/genre/tv/list': { genres: [] },
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const movieGenres = await client.genres('MOVIE')
    const tvGenres = await client.genres('TV_SHOW')

    expect(requests.map(r => r.url)).toEqual([
      'https://api.themoviedb.org/3/genre/movie/list',
      'https://api.themoviedb.org/3/genre/tv/list',
    ])
    expect(movieGenres).toEqual([
      { id: 28, name: '動作' },
      { id: 878, name: '科幻' },
    ])
    expect(tvGenres).toEqual([])
  })
})

describe('tmdb client — token safety', () => {
  it('never exposes the access token in any operation output', async () => {
    const token = 'secret-access-token-xyz'
    const { fetchJson } = createFakeTransport({
      '/3/search/multi': SEARCH_MULTI_PAGE,
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
      '/3/movie/419430': MOVIE_DETAIL,
      '/3/movie/419430/watch/providers': MOVIE_PROVIDERS,
      '/3/tv/94605/recommendations': TV_RECOMMENDATIONS_PAGE,
      '/3/genre/tv/list': { genres: [] },
    })
    const client = createTmdbClient({ token, fetchJson })

    const outputs = await Promise.all([
      client.searchMulti('dune'),
      client.discover('MOVIE'),
      client.title('MOVIE', 419430),
      client.watchProviders('MOVIE', 419430),
      client.recommendations('TV_SHOW', 94605),
      client.genres('TV_SHOW'),
    ])

    const serialized = JSON.stringify(outputs)
    expect(serialized).not.toContain(token)
  })
})

describe('getTmdbClient', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('throws an actionable error when TMDB_TOKEN is missing', async () => {
    vi.stubEnv('TMDB_TOKEN', '')
    const { getTmdbClient } = await import('./client')

    expect(() => getTmdbClient()).toThrowError(/TMDB_TOKEN/)
  })

  it('wires the env token into outgoing requests through the default transport', async () => {
    vi.stubEnv('TMDB_TOKEN', 'env-token-abc')
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: { headers?: Record<string, string> }) =>
      new Response(JSON.stringify(SEARCH_MULTI_PAGE), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { getTmdbClient } = await import('./client')

    const page = await getTmdbClient().searchMulti('dune')

    expect(page.results[0]).toMatchObject({ tmdbId: 419430 })
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer env-token-abc',
    })
  })
})

describe('tmdb client — response caching', () => {
  it('serves repeat calls from cache within TTL and refetches after expiry', async () => {
    let nowMs = 1_000_000
    const { fetchJson, requests } = createFakeTransport({
      '/3/search/multi': SEARCH_MULTI_PAGE,
    })
    const client = createTmdbClient({
      token: 'test-token',
      fetchJson,
      now: () => nowMs,
    })

    await client.searchMulti('dune')
    await client.searchMulti('dune')

    expect(requests).toHaveLength(1)

    nowMs += SEARCH_TTL_MS + 1
    await client.searchMulti('dune')

    expect(requests).toHaveLength(2)
  })

  it('caches per distinct arguments', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/search/multi': SEARCH_MULTI_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.searchMulti('dune')
    await client.searchMulti('dune', 2)

    expect(requests).toHaveLength(2)
  })

  it('caches a missing title with the short negative TTL, not the detail TTL', async () => {
    let nowMs = 1_000_000
    let fetchCount = 0
    const fetchJson: FetchJson = async () => {
      fetchCount += 1
      throw new TmdbApiError(404, 'The resource you requested could not be found.')
    }
    const client = createTmdbClient({
      token: 'test-token',
      fetchJson,
      now: () => nowMs,
    })

    await client.title('MOVIE', 404404)
    await client.title('MOVIE', 404404)

    expect(fetchCount).toBe(1)

    nowMs += NOT_FOUND_TTL_MS + 1
    await client.title('MOVIE', 404404)

    expect(fetchCount).toBe(2)
  })

  it('caches a found title for the full detail TTL', async () => {
    let nowMs = 1_000_000
    const { fetchJson, requests } = createFakeTransport({
      '/3/movie/419430': MOVIE_DETAIL,
    })
    const client = createTmdbClient({
      token: 'test-token',
      fetchJson,
      now: () => nowMs,
    })

    await client.title('MOVIE', 419430)
    await client.title('MOVIE', 419430)

    expect(requests).toHaveLength(1)

    nowMs += DETAIL_TTL_MS - 1
    await client.title('MOVIE', 419430)

    expect(requests).toHaveLength(1)

    nowMs += 1
    await client.title('MOVIE', 419430)

    expect(requests).toHaveLength(2)
  })

  it('never caches transport failures', async () => {
    const nowMs = 1_000_000
    let fetchCount = 0
    const fetchJson: FetchJson = async () => {
      fetchCount += 1
      throw new TmdbApiError(500, 'Internal Server Error')
    }
    const client = createTmdbClient({
      token: 'test-token',
      fetchJson,
      now: () => nowMs,
    })

    await expect(client.title('MOVIE', 123)).rejects.toThrow(TmdbApiError)
    await expect(client.title('MOVIE', 123)).rejects.toThrow(TmdbApiError)
    await expect(client.title('MOVIE', 123)).rejects.toThrow(TmdbApiError)

    expect(fetchCount).toBe(3)
  })
})

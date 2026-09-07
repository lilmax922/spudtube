import { describe, expect, it } from 'vitest'
import { createTmdbClient, TmdbApiError } from './client'
import { createFakeTransport } from './fake-transport'

const MOVIE_PAGE = {
  page: 1,
  total_pages: 10,
  total_results: 200,
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

const TV_PAGE = {
  page: 1,
  total_pages: 8,
  total_results: 150,
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

describe('tmdb client: fixed list readers', () => {
  it('reads the popular list for each kind with paging params', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/tv/popular': TV_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.popular('TV_SHOW', 3)

    expect(requests[0]).toEqual({
      url: 'https://api.themoviedb.org/3/tv/popular',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      params: { page: '3', language: 'zh-TW' },
    })
    expect(page.results[0]).toMatchObject({ kind: 'TV_SHOW', tmdbId: 94605, name: 'Arcane' })
  })

  it('caches popular independently per kind segment', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/movie/popular': MOVIE_PAGE,
      '/3/tv/popular': TV_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.popular('MOVIE')
    await client.popular('MOVIE')
    await client.popular('TV_SHOW')

    expect(requests).toHaveLength(2)
    expect(requests.map(request => request.url)).toEqual([
      'https://api.themoviedb.org/3/movie/popular',
      'https://api.themoviedb.org/3/tv/popular',
    ])
  })

  it('reads the movie-only now playing list and guards tv shows', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/movie/now_playing': MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.nowPlaying('MOVIE', 2, 'en')

    expect(requests[0]).toEqual({
      url: 'https://api.themoviedb.org/3/movie/now_playing',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      params: { page: '2', language: 'en' },
    })
    expect(page.results[0]).toMatchObject({ kind: 'MOVIE', tmdbId: 693134 })

    expect(() => client.nowPlaying('TV_SHOW')).toThrowError(TmdbApiError)
    try {
      client.nowPlaying('TV_SHOW')
      expect.unreachable()
    }
    catch (error) {
      expect((error as TmdbApiError).status).toBe(400)
    }
    expect(requests).toHaveLength(1)
  })

  it('reads the movie-only upcoming list and guards tv shows', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/movie/upcoming': MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.upcoming('MOVIE')

    expect(requests[0]?.url).toBe('https://api.themoviedb.org/3/movie/upcoming')
    expect(requests[0]?.params).toEqual({ page: '1', language: 'zh-TW' })
    expect(page.results[0]).toMatchObject({ kind: 'MOVIE', tmdbId: 693134 })

    expect(() => client.upcoming('TV_SHOW')).toThrowError(TmdbApiError)
    expect(requests).toHaveLength(1)
  })

  it('reads the tv-only airing today list and guards movies', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/tv/airing_today': TV_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.airingToday('TV_SHOW', 1, 'en')

    expect(requests[0]).toEqual({
      url: 'https://api.themoviedb.org/3/tv/airing_today',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      params: { page: '1', language: 'en' },
    })
    expect(page.results[0]).toMatchObject({ kind: 'TV_SHOW', tmdbId: 94605 })

    expect(() => client.airingToday('MOVIE')).toThrowError(TmdbApiError)
    try {
      client.airingToday('MOVIE')
      expect.unreachable()
    }
    catch (error) {
      expect((error as TmdbApiError).status).toBe(400)
    }
    expect(requests).toHaveLength(1)
  })

  it('reads the tv-only on the air list and guards movies', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/tv/on_the_air': TV_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const page = await client.onTheAir('TV_SHOW')

    expect(requests[0]?.url).toBe('https://api.themoviedb.org/3/tv/on_the_air')
    expect(page.results[0]).toMatchObject({ kind: 'TV_SHOW', tmdbId: 94605 })

    expect(() => client.onTheAir('MOVIE')).toThrowError(TmdbApiError)
    expect(requests).toHaveLength(1)
  })
})

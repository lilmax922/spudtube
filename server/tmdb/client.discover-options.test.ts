import { describe, expect, it } from 'vitest'
import { createTmdbClient, TmdbApiError } from './client'
import { createFakeTransport } from './fake-transport'

const DISCOVER_MOVIE_PAGE = {
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

describe('tmdb client — discover extended options', () => {
  it('pipe-joins multiple genre ids as OR', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.discover('MOVIE', { genreIds: [27, 53, 9648] })

    expect(requests[0]?.params.with_genres).toBe('27|53|9648')
  })

  it('passes keyword ids straight through as pipe-joined OR', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.discover('MOVIE', { keywordIds: [1722, 4129] })

    expect(requests[0]?.params.with_keywords).toBe('1722|4129')
  })

  it('sends vote_count.gte alongside vote_average.gte', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.discover('MOVIE', { minRating: 7.5, minVoteCount: 100 })

    expect(requests[0]?.params).toEqual(expect.objectContaining({
      'vote_average.gte': '7.5',
      'vote_count.gte': '100',
    }))
  })

  it('defaults sort_by to popularity.desc', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.discover('MOVIE')

    expect(requests[0]?.params.sort_by).toBe('popularity.desc')
  })

  it('accepts a whitelisted sort order', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.discover('MOVIE', { sortBy: 'vote_average.desc' })

    expect(requests[0]?.params.sort_by).toBe('vote_average.desc')
  })

  it('rejects a sort order outside the whitelist with a clean client error', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const error = await client.discover('MOVIE', { sortBy: 'revenue.desc' as 'popularity.desc' }).catch(error => error)
    expect(error).toBeInstanceOf(TmdbApiError)
    expect((error as TmdbApiError).status).toBe(400)
    expect(requests).toHaveLength(0)
  })

  it('maps movie release date ranges to primary_release_date bounds', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.discover('MOVIE', { releaseDateGte: '2020-01-01', releaseDateLte: '2024-12-31' })

    expect(requests[0]?.params).toEqual(expect.objectContaining({
      'primary_release_date.gte': '2020-01-01',
      'primary_release_date.lte': '2024-12-31',
    }))
  })

  it('maps tv first-air date ranges to first_air_date bounds', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/tv': {
        page: 1,
        total_pages: 5,
        total_results: 90,
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
      },
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.discover('TV_SHOW', { firstAirDateGte: '2019-01-01', firstAirDateLte: '2024-12-31' })

    expect(requests[0]?.params).toEqual(expect.objectContaining({
      'first_air_date.gte': '2019-01-01',
      'first_air_date.lte': '2024-12-31',
    }))
  })

  it('covers every new discover parameter in the cache key', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/discover/movie': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.discover('MOVIE', { genreIds: [27], keywordIds: [1722] })
    await client.discover('MOVIE', { genreIds: [27], keywordIds: [1722] })
    expect(requests).toHaveLength(1)

    await client.discover('MOVIE', { genreIds: [27], keywordIds: [9999] })
    expect(requests).toHaveLength(2)

    await client.discover('MOVIE', { genreIds: [27], minVoteCount: 100 })
    expect(requests).toHaveLength(3)

    await client.discover('MOVIE', { genreIds: [27], sortBy: 'vote_average.desc' })
    expect(requests).toHaveLength(4)

    await client.discover('MOVIE', { genreIds: [27], releaseDateGte: '2020-01-01' })
    expect(requests).toHaveLength(5)
  })

  it('reads weekly trending by default and daily on request', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/trending/movie/week': DISCOVER_MOVIE_PAGE,
      '/3/trending/movie/day': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    await client.trending('MOVIE')
    expect(requests[0]?.url).toBe('https://api.themoviedb.org/3/trending/movie/week')

    await client.trending('MOVIE', 1, 'zh-TW', 'day')
    expect(requests[1]?.url).toBe('https://api.themoviedb.org/3/trending/movie/day')
  })

  it('rejects an unknown trending window with a clean client error', async () => {
    const { fetchJson, requests } = createFakeTransport({
      '/3/trending/movie/week': DISCOVER_MOVIE_PAGE,
    })
    const client = createTmdbClient({ token: 'test-token', fetchJson })

    const error = await client.trending('MOVIE', 1, 'zh-TW', 'month' as 'week').catch(error => error)
    expect(error).toBeInstanceOf(TmdbApiError)
    expect((error as TmdbApiError).status).toBe(400)
    expect(requests).toHaveLength(0)
  })
})

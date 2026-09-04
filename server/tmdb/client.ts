import type { Genre, Kind, Page, Provider, ProviderCatalog, TitleDetail, TitleSummary, TmdbLanguage } from './types'
import process from 'node:process'
import { createTtlCache } from './cache'
import {
  DEFAULT_TMDB_LANGUAGE,
  DETAIL_TTL_MS,
  NOT_FOUND_TTL_MS,
  SEARCH_TTL_MS,
  TMDB_BASE_URL,
} from './constants'
import { localizeGenres } from './genres'
import {
  mapMovieDetail,
  mapMovieSummary,
  mapPage,
  mapProviderCatalog,
  mapTvDetail,
  mapTvSummary,
  toKind,
  toMediaSegment,
} from './mappers'
import {
  rawGenreListSchema,
  rawListPageSchema,
  rawMovieDetailSchema,
  rawMovieSummarySchema,
  rawProviderCatalogSchema,
  rawTvDetailSchema,
  rawTvSummarySchema,
  rawWatchProviderListSchema,
} from './schemas'

export interface FetchJsonInit {
  headers?: Record<string, string>
}

export type FetchJson = (url: string, init?: FetchJsonInit) => Promise<unknown>

export class TmdbApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'TmdbApiError'
  }
}

export interface TmdbClientDeps {
  token: string
  fetchJson?: FetchJson
  now?: () => number
}

export const DISCOVER_SORT_BY_WHITELIST = [
  'popularity.asc',
  'popularity.desc',
  'vote_average.asc',
  'vote_average.desc',
  'vote_count.asc',
  'vote_count.desc',
  'primary_release_date.asc',
  'primary_release_date.desc',
  'first_air_date.asc',
  'first_air_date.desc',
  'original_title.asc',
  'original_title.desc',
] as const

export type DiscoverSortBy = typeof DISCOVER_SORT_BY_WHITELIST[number]

export const DEFAULT_DISCOVER_SORT_BY: DiscoverSortBy = 'popularity.desc'

export type TrendingWindow = 'day' | 'week'

export const DEFAULT_TRENDING_WINDOW: TrendingWindow = 'week'

export interface DiscoverOptions {
  genreIds?: number[]
  keywordIds?: number[]
  minRating?: number
  minVoteCount?: number
  sortBy?: DiscoverSortBy
  releaseDateGte?: string
  releaseDateLte?: string
  firstAirDateGte?: string
  firstAirDateLte?: string
  providerIds?: number[]
  watchRegion?: string
  page?: number
  language?: TmdbLanguage
}

export interface TmdbClient {
  searchMulti: (query: string, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  discover: (kind: Kind, options?: DiscoverOptions) => Promise<Page<TitleSummary>>
  trending: (kind: Kind, page?: number, language?: TmdbLanguage, window?: TrendingWindow) => Promise<Page<TitleSummary>>
  topRated: (kind: Kind, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  popular: (kind: Kind, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  nowPlaying: (kind: Kind, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  upcoming: (kind: Kind, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  airingToday: (kind: Kind, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  onTheAir: (kind: Kind, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  title: (kind: Kind, tmdbId: number, language?: TmdbLanguage) => Promise<TitleDetail | null>
  watchProviders: (kind: Kind, tmdbId: number, language?: TmdbLanguage) => Promise<ProviderCatalog>
  watchProviderList: (kind: Kind, language?: TmdbLanguage, watchRegion?: string) => Promise<Provider[]>
  recommendations: (kind: Kind, tmdbId: number, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  genres: (kind: Kind, language?: TmdbLanguage) => Promise<Genre[]>
}

const defaultFetchJson: FetchJson = async (url, init) => {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new TmdbApiError(response.status, `TMDB request failed: ${response.status}`)
  }
  return await response.json()
}

async function readListPath(
  kind: Kind,
  path: string,
  page: number,
  language: TmdbLanguage,
  cache: ReturnType<typeof createTtlCache>,
  request: (path: string, params: Record<string, string>) => Promise<unknown>,
): Promise<Page<TitleSummary>> {
  const segment = toMediaSegment(kind)
  return cache.wrap(`list:${language}:${segment}:${path}:${page}`, SEARCH_TTL_MS, async () => {
    const raw = rawListPageSchema.parse(await request(path, {
      page: String(page),
      language,
    }))
    return mapPage(raw, raw.results.map(item =>
      kind === 'MOVIE'
        ? mapMovieSummary(rawMovieSummarySchema.parse(item))
        : mapTvSummary(rawTvSummarySchema.parse(item)),
    ))
  })
}

export function createTmdbClient({
  token,
  fetchJson = defaultFetchJson,
  now = Date.now,
}: TmdbClientDeps): TmdbClient {
  const headers = {
    Authorization: `Bearer ${token}`,
    accept: 'application/json',
  }
  const cache = createTtlCache({ now })

  async function request(
    path: string,
    params: Record<string, string>,
  ): Promise<unknown> {
    const url = new URL(`${TMDB_BASE_URL}${path}`)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    return await fetchJson(url.toString(), { headers })
  }

  function mapSearchResults(items: unknown[]): TitleSummary[] {
    return items.flatMap((item) => {
      const mediaType = toKind(String((item as { media_type?: unknown }).media_type ?? ''))
      if (!mediaType)
        return []
      return mediaType === 'MOVIE'
        ? [mapMovieSummary(rawMovieSummarySchema.parse(item))]
        : [mapTvSummary(rawTvSummarySchema.parse(item))]
    })
  }

  return {
    searchMulti(query: string, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      return cache.wrap(`search-multi:${language}:${query}:${page}`, SEARCH_TTL_MS, async () => {
        const raw = rawListPageSchema.parse(
          await request('/search/multi', {
            query,
            page: String(page),
            language,
            include_adult: 'false',
          }),
        )
        return mapPage(raw, mapSearchResults(raw.results))
      })
    },

    async discover(kind: Kind, options: DiscoverOptions = {}): Promise<Page<TitleSummary>> {
      const { genreIds, keywordIds, minRating, minVoteCount, sortBy = DEFAULT_DISCOVER_SORT_BY, releaseDateGte, releaseDateLte, firstAirDateGte, firstAirDateLte, providerIds, watchRegion, page = 1, language = DEFAULT_TMDB_LANGUAGE } = options
      if (!(DISCOVER_SORT_BY_WHITELIST as readonly string[]).includes(sortBy)) {
        throw new TmdbApiError(400, `Unsupported discover sort_by: ${sortBy}`)
      }
      const params: Record<string, string> = {
        sort_by: sortBy,
        page: String(page),
        language,
      }
      if (genreIds && genreIds.length > 0)
        params.with_genres = genreIds.join('|')
      if (keywordIds && keywordIds.length > 0)
        params.with_keywords = keywordIds.join('|')
      if (minRating != null)
        params['vote_average.gte'] = String(minRating)
      if (minVoteCount != null)
        params['vote_count.gte'] = String(minVoteCount)
      if (releaseDateGte != null)
        params['primary_release_date.gte'] = releaseDateGte
      if (releaseDateLte != null)
        params['primary_release_date.lte'] = releaseDateLte
      if (firstAirDateGte != null)
        params['first_air_date.gte'] = firstAirDateGte
      if (firstAirDateLte != null)
        params['first_air_date.lte'] = firstAirDateLte
      if (providerIds && providerIds.length > 0) {
        params.with_watch_providers = providerIds.join('|')
        if (watchRegion)
          params.watch_region = watchRegion
      }
      const segment = toMediaSegment(kind)
      const cacheKey = [
        'discover',
        language,
        segment,
        params.with_genres ?? '',
        params.with_keywords ?? '',
        params['vote_average.gte'] ?? '',
        params['vote_count.gte'] ?? '',
        params.sort_by,
        params['primary_release_date.gte'] ?? '',
        params['primary_release_date.lte'] ?? '',
        params['first_air_date.gte'] ?? '',
        params['first_air_date.lte'] ?? '',
        params.with_watch_providers ?? '',
        params.watch_region ?? '',
        String(page),
      ].join(':')
      return cache.wrap(cacheKey, SEARCH_TTL_MS, async () => {
        const raw = rawListPageSchema.parse(await request(`/discover/${segment}`, params))
        return mapPage(raw, raw.results.map(item =>
          kind === 'MOVIE'
            ? mapMovieSummary(rawMovieSummarySchema.parse(item))
            : mapTvSummary(rawTvSummarySchema.parse(item)),
        ))
      })
    },

    async trending(kind: Kind, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE, window: TrendingWindow = DEFAULT_TRENDING_WINDOW): Promise<Page<TitleSummary>> {
      if (window !== 'day' && window !== 'week') {
        throw new TmdbApiError(400, `Unsupported trending window: ${String(window)}`)
      }
      const segment = toMediaSegment(kind)
      return cache.wrap(`trending:${language}:${segment}:${window}:${page}`, SEARCH_TTL_MS, async () => {
        const raw = rawListPageSchema.parse(
          await request(`/trending/${segment}/${window}`, {
            page: String(page),
            language,
          }),
        )
        return mapPage(raw, raw.results.map(item =>
          kind === 'MOVIE'
            ? mapMovieSummary(rawMovieSummarySchema.parse(item))
            : mapTvSummary(rawTvSummarySchema.parse(item)),
        ))
      })
    },

    popular(kind: Kind, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      return readListPath(kind, `/${toMediaSegment(kind)}/popular`, page, language, cache, request)
    },

    nowPlaying(kind: Kind, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      if (kind !== 'MOVIE')
        throw new TmdbApiError(400, 'nowPlaying is only available for movies')
      return readListPath(kind, '/movie/now_playing', page, language, cache, request)
    },

    upcoming(kind: Kind, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      if (kind !== 'MOVIE')
        throw new TmdbApiError(400, 'upcoming is only available for movies')
      return readListPath(kind, '/movie/upcoming', page, language, cache, request)
    },

    airingToday(kind: Kind, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      if (kind !== 'TV_SHOW')
        throw new TmdbApiError(400, 'airingToday is only available for tv shows')
      return readListPath(kind, '/tv/airing_today', page, language, cache, request)
    },

    onTheAir(kind: Kind, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      if (kind !== 'TV_SHOW')
        throw new TmdbApiError(400, 'onTheAir is only available for tv shows')
      return readListPath(kind, '/tv/on_the_air', page, language, cache, request)
    },

    topRated(kind: Kind, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      const segment = toMediaSegment(kind)
      return cache.wrap(`top-rated:${language}:${segment}:${page}`, SEARCH_TTL_MS, async () => {
        const raw = rawListPageSchema.parse(
          await request(`/${segment}/top_rated`, {
            page: String(page),
            language,
          }),
        )
        return mapPage(raw, raw.results.map(item =>
          kind === 'MOVIE'
            ? mapMovieSummary(rawMovieSummarySchema.parse(item))
            : mapTvSummary(rawTvSummarySchema.parse(item)),
        ))
      })
    },

    title(kind: Kind, tmdbId: number, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<TitleDetail | null> {
      const segment = toMediaSegment(kind)
      const append = kind === 'MOVIE'
        ? 'videos,translations,credits,images,release_dates'
        : 'videos,translations,credits,images,content_ratings'
      return cache.wrap(`detail:${language}:${segment}:${tmdbId}`, value =>
        value ? DETAIL_TTL_MS : NOT_FOUND_TTL_MS, async () => {
        let raw: unknown
        try {
          raw = await request(`/${segment}/${tmdbId}`, {
            language,
            append_to_response: append,
          })
        }
        catch (error) {
          if (error instanceof TmdbApiError && error.status === 404)
            return null
          throw error
        }
        return kind === 'MOVIE'
          ? mapMovieDetail(rawMovieDetailSchema.parse(raw), language)
          : mapTvDetail(rawTvDetailSchema.parse(raw), language)
      })
    },

    watchProviders(kind: Kind, tmdbId: number, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<ProviderCatalog> {
      const segment = toMediaSegment(kind)
      return cache.wrap(`providers:${language}:${segment}:${tmdbId}`, DETAIL_TTL_MS, async () => {
        const raw = rawProviderCatalogSchema.parse(
          await request(`/${segment}/${tmdbId}/watch/providers`, {}),
        )
        return mapProviderCatalog(raw)
      })
    },

    watchProviderList(kind: Kind, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE, watchRegion?: string): Promise<Provider[]> {
      const segment = toMediaSegment(kind)
      const cacheKey = `provider-list:${language}:${segment}:${watchRegion ?? ''}`
      return cache.wrap(cacheKey, DETAIL_TTL_MS, async () => {
        const params: Record<string, string> = { language }
        if (watchRegion)
          params.watch_region = watchRegion
        const raw = rawWatchProviderListSchema.parse(
          await request(`/watch/providers/${segment}`, params),
        )
        return raw.results.map(entry => ({
          id: entry.provider_id,
          name: entry.provider_name,
          logoPath: entry.logo_path,
          displayPriority: entry.display_priority,
        }))
      })
    },

    recommendations(kind: Kind, tmdbId: number, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      const segment = toMediaSegment(kind)
      return cache.wrap(`recommendations:${language}:${segment}:${tmdbId}:${page}`, SEARCH_TTL_MS, async () => {
        const raw = rawListPageSchema.parse(
          await request(`/${segment}/${tmdbId}/recommendations`, {
            page: String(page),
            language,
          }),
        )
        return mapPage(raw, raw.results.map(item =>
          kind === 'MOVIE'
            ? mapMovieSummary(rawMovieSummarySchema.parse(item))
            : mapTvSummary(rawTvSummarySchema.parse(item)),
        ))
      })
    },

    genres(kind: Kind, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Genre[]> {
      const segment = toMediaSegment(kind)
      return cache.wrap(`genres:${language}:${segment}`, DETAIL_TTL_MS, async () => {
        const raw = rawGenreListSchema.parse(await request(`/genre/${segment}/list`, { language }))
        const genres = raw.genres.map(genre => ({ id: genre.id, name: genre.name }))
        return localizeGenres(genres, language)
      })
    },
  }
}

let configuredClient: TmdbClient | undefined

export function getTmdbClient(): TmdbClient {
  configuredClient ??= createTmdbClient({ token: readTokenFromEnv() })
  return configuredClient
}

function readTokenFromEnv(): string {
  const token = process.env.TMDB_TOKEN
  if (!token) {
    throw new Error(
      'TMDB_TOKEN is not set — add the TMDB API v4 read access token to the server environment',
    )
  }
  return token
}

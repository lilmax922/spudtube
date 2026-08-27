import type { Genre, Kind, Page, ProviderCatalog, TitleDetail, TitleSummary, TmdbLanguage } from './types'
import process from 'node:process'
import { createTtlCache } from './cache'
import {
  DEFAULT_TMDB_LANGUAGE,
  DETAIL_TTL_MS,
  NOT_FOUND_TTL_MS,
  SEARCH_TTL_MS,
  TMDB_BASE_URL,
} from './constants'
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

export interface DiscoverOptions {
  genreIds?: number[]
  page?: number
  language?: TmdbLanguage
}

export interface TmdbClient {
  searchMulti: (query: string, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  discover: (kind: Kind, options?: DiscoverOptions) => Promise<Page<TitleSummary>>
  trending: (kind: Kind, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  topRated: (kind: Kind, page?: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
  title: (kind: Kind, tmdbId: number, language?: TmdbLanguage) => Promise<TitleDetail | null>
  watchProviders: (kind: Kind, tmdbId: number, language?: TmdbLanguage) => Promise<ProviderCatalog>
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

    discover(kind: Kind, options: DiscoverOptions = {}): Promise<Page<TitleSummary>> {
      const { genreIds, page = 1, language = DEFAULT_TMDB_LANGUAGE } = options
      const params: Record<string, string> = {
        sort_by: 'popularity.desc',
        page: String(page),
        language,
      }
      if (genreIds && genreIds.length > 0)
        params.with_genres = genreIds.join('|')
      const segment = toMediaSegment(kind)
      return cache.wrap(`discover:${language}:${segment}:${params.with_genres ?? ''}:${page}`, SEARCH_TTL_MS, async () => {
        const raw = rawListPageSchema.parse(await request(`/discover/${segment}`, params))
        return mapPage(raw, raw.results.map(item =>
          kind === 'MOVIE'
            ? mapMovieSummary(rawMovieSummarySchema.parse(item))
            : mapTvSummary(rawTvSummarySchema.parse(item)),
        ))
      })
    },

    trending(kind: Kind, page = 1, language: TmdbLanguage = DEFAULT_TMDB_LANGUAGE): Promise<Page<TitleSummary>> {
      const segment = toMediaSegment(kind)
      return cache.wrap(`trending:${language}:${segment}:${page}`, SEARCH_TTL_MS, async () => {
        const raw = rawListPageSchema.parse(
          await request(`/trending/${segment}/week`, {
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
      return cache.wrap(`detail:${language}:${segment}:${tmdbId}`, value =>
        value ? DETAIL_TTL_MS : NOT_FOUND_TTL_MS, async () => {
        let raw: unknown
        try {
          raw = await request(`/${segment}/${tmdbId}`, {
            language,
            append_to_response: 'videos,translations',
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
        return raw.genres.map(genre => ({ id: genre.id, name: genre.name }))
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

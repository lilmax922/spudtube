import type { z } from 'zod'
import type {
  rawGenreSchema,
  rawMovieDetailSchema,
  rawMovieSummarySchema,
  rawProviderCatalogSchema,
  rawRegionAvailabilitySchema,
  rawTvDetailSchema,
  rawTvSummarySchema,
} from './schemas'
import type { CastMember, CrewMember, Genre, Kind, Page, Provider, ProviderCatalog, TitleDetail, TitleSummary, TmdbLanguage } from './types'
import { localizeGenres } from './genres'

export function toKind(mediaType: string): Kind | null {
  if (mediaType === 'movie')
    return 'MOVIE'
  if (mediaType === 'tv')
    return 'TV_SHOW'
  return null
}

export function toMediaSegment(kind: Kind): 'movie' | 'tv' {
  return kind === 'MOVIE' ? 'movie' : 'tv'
}

export function kindFromSegment(segment: 'movie' | 'tv'): Kind {
  return segment === 'movie' ? 'MOVIE' : 'TV_SHOW'
}

export function mapMovieSummary(
  raw: z.infer<typeof rawMovieSummarySchema>,
): TitleSummary {
  return {
    kind: 'MOVIE',
    tmdbId: raw.id,
    name: raw.title,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: raw.release_date,
    voteAverage: raw.vote_average,
    genreIds: raw.genre_ids ?? [],
    overview: raw.overview || null,
  }
}

export function mapTvSummary(raw: z.infer<typeof rawTvSummarySchema>): TitleSummary {
  return {
    kind: 'TV_SHOW',
    tmdbId: raw.id,
    name: raw.name,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: raw.first_air_date,
    voteAverage: raw.vote_average,
    genreIds: raw.genre_ids ?? [],
    overview: raw.overview || null,
  }
}

export function mapPage<T>(
  raw: { page: number, total_pages: number, total_results: number },
  results: T[],
): Page<T> {
  return {
    page: raw.page,
    results,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
  }
}

function orNull(value: string | null | undefined): string | null {
  if (value == null || value === '')
    return null
  return value
}

export function mapGenres(raw: z.infer<typeof rawGenreSchema>[], language: TmdbLanguage = 'zh-TW'): Genre[] {
  const genres = raw.map(genre => ({ id: genre.id, name: genre.name }))
  return localizeGenres(genres, language)
}

export function pickTrailerKey(
  videos: z.infer<typeof rawMovieDetailSchema>['videos'],
  preferred: TmdbLanguage = 'zh-TW',
): string | null {
  const results = videos?.results ?? []
  const trailers = results.filter(
    video => video.site === 'YouTube' && video.type === 'Trailer',
  )
  const primary = preferred === 'zh-TW' ? 'zh' : 'en'
  const fallback = preferred === 'zh-TW' ? 'en' : 'zh'
  const preferredChoice
    = trailers.find(video => video.iso_639_1 === primary && video.official === true)
      ?? trailers.find(video => video.iso_639_1 === fallback && video.official === true)
      ?? trailers.find(video => video.official === true)
      ?? trailers[0]
  return preferredChoice?.key ?? null
}

export function pickOverview(
  base: string,
  translations: z.infer<typeof rawMovieDetailSchema>['translations'],
  preferred: TmdbLanguage = 'zh-TW',
): string {
  if (base !== '')
    return base
  const list = translations?.translations ?? []
  const zh = list.find(t => t.iso_639_1 === 'zh' && t.iso_3166_1 === 'TW')
  const en = list.find(t => t.iso_639_1 === 'en')
  if (preferred === 'zh-TW')
    return zh?.data.overview || en?.data.overview || ''
  return en?.data.overview || zh?.data.overview || ''
}

export function mapCast(raw: z.infer<typeof rawMovieDetailSchema>['credits']): CastMember[] {
  if (!raw)
    return []
  return raw.cast
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(cast => ({
      id: cast.id,
      name: cast.name,
      character: orNull(cast.character),
      profilePath: cast.profile_path,
    }))
}

export function mapCrew(raw: z.infer<typeof rawMovieDetailSchema>['credits']): CrewMember[] {
  if (!raw)
    return []
  return raw.crew.map(member => ({
    id: member.id,
    name: member.name,
    job: member.job,
    department: member.department ?? null,
  }))
}

export function mapBackdrops(raw: z.infer<typeof rawMovieDetailSchema>['images']): string[] {
  if (!raw)
    return []
  return raw.backdrops.map(image => image.file_path)
}

export function pickContentRating(
  releaseDates: z.infer<typeof rawMovieDetailSchema>['release_dates'],
  contentRatings: z.infer<typeof rawTvDetailSchema>['content_ratings'],
  preferredRegion = 'TW',
): string | null {
  const fromMovie = releaseDates?.results
  if (fromMovie && fromMovie.length > 0) {
    const preferred = fromMovie.find(entry => entry.iso_3166_1 === preferredRegion)
    const fallback = fromMovie.find(entry => entry.iso_3166_1 === 'US') ?? fromMovie[0]
    const chosen = preferred ?? fallback
    if (chosen) {
      const cert = chosen.release_dates.find(entry => entry.certification !== '')
      if (cert)
        return cert.certification
    }
  }
  const fromTv = contentRatings?.results
  if (fromTv && fromTv.length > 0) {
    const preferred = fromTv.find(entry => entry.iso_3166_1 === preferredRegion)
    const fallback = fromTv.find(entry => entry.iso_3166_1 === 'US') ?? fromTv[0]
    const chosen = preferred ?? fallback
    if (chosen && chosen.rating !== '')
      return chosen.rating
  }
  return null
}

export function pickCrewByJob(
  crew: CrewMember[],
  job: string,
): CrewMember | null {
  return crew.find(member => member.job === job) ?? null
}

export function mapMovieDetail(
  raw: z.infer<typeof rawMovieDetailSchema>,
  language: TmdbLanguage = 'zh-TW',
): TitleDetail {
  return {
    kind: 'MOVIE',
    tmdbId: raw.id,
    name: raw.title,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: orNull(raw.release_date),
    voteAverage: raw.vote_average,
    overview: pickOverview(raw.overview, raw.translations, language),
    tagline: orNull(raw.tagline),
    originalName: raw.original_title ?? null,
    originalLanguage: raw.original_language ?? null,
    status: raw.status ?? null,
    genres: mapGenres(raw.genres, language),
    runtimeMinutes: raw.runtime,
    trailerKey: pickTrailerKey(raw.videos, language),
    budget: raw.budget ?? null,
    revenue: raw.revenue ?? null,
    contentRating: pickContentRating(raw.release_dates, undefined),
    cast: mapCast(raw.credits),
    crew: mapCrew(raw.credits),
    backdrops: mapBackdrops(raw.images),
  }
}

export function mapTvDetail(
  raw: z.infer<typeof rawTvDetailSchema>,
  language: TmdbLanguage = 'zh-TW',
): TitleDetail {
  return {
    kind: 'TV_SHOW',
    tmdbId: raw.id,
    name: raw.name,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: orNull(raw.first_air_date),
    voteAverage: raw.vote_average,
    overview: pickOverview(raw.overview, raw.translations, language),
    tagline: orNull(raw.tagline),
    originalName: raw.original_name ?? null,
    originalLanguage: raw.original_language ?? null,
    status: raw.status ?? null,
    genres: mapGenres(raw.genres, language),
    runtimeMinutes: raw.episode_run_time[0] ?? null,
    trailerKey: pickTrailerKey(raw.videos, language),
    budget: null,
    revenue: null,
    contentRating: pickContentRating(undefined, raw.content_ratings),
    cast: mapCast(raw.credits),
    crew: mapCrew(raw.credits),
    backdrops: mapBackdrops(raw.images),
  }
}

function mapProviderEntries(
  entries: z.infer<typeof rawRegionAvailabilitySchema>['flatrate'],
): Provider[] {
  return (entries ?? []).map(entry => ({
    id: entry.provider_id,
    name: entry.provider_name,
    logoPath: entry.logo_path,
  }))
}

export function mapProviderCatalog(
  raw: z.infer<typeof rawProviderCatalogSchema>,
): ProviderCatalog {
  return Object.fromEntries(
    Object.entries(raw.results).map(([region, regionRaw]) => [
      region,
      {
        link: regionRaw.link ?? null,
        groups: {
          subscription: mapProviderEntries(regionRaw.flatrate),
          free: mapProviderEntries(regionRaw.free),
          rent: mapProviderEntries(regionRaw.rent),
          buy: mapProviderEntries(regionRaw.buy),
        },
      },
    ]),
  )
}

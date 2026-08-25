export type TmdbLanguage = 'zh-TW' | 'en'

export type Kind = 'MOVIE' | 'TV_SHOW'

export interface Page<T> {
  page: number
  results: T[]
  totalPages: number
  totalResults: number
}

export interface TitleSummary {
  kind: Kind
  tmdbId: number
  name: string
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string | null
  voteAverage: number | null
}

export interface Genre {
  id: number
  name: string
}

export interface TitleDetail extends TitleSummary {
  overview: string
  tagline: string | null
  genres: Genre[]
  runtimeMinutes: number | null
  trailerKey: string | null
}

export interface Provider {
  id: number
  name: string
  logoPath: string | null
}

export interface AvailabilityGroups {
  subscription: Provider[]
  free: Provider[]
  rent: Provider[]
  buy: Provider[]
}

export interface RegionAvailability {
  link: string | null
  groups: AvailabilityGroups
}

export type ProviderCatalog = Record<string, RegionAvailability>

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
  genreIds?: number[]
  overview?: string | null
}

export interface DiscoveryBadges {
  trendingIds: number[]
  topRatedIds: number[]
}

export interface Genre {
  id: number
  name: string
}

export interface CastMember {
  id: number
  name: string
  character: string | null
  profilePath: string | null
}

export interface CrewMember {
  id: number
  name: string
  job: string
  department: string | null
}

export interface TitleDetail extends TitleSummary {
  overview: string
  tagline: string | null
  originalName: string | null
  originalLanguage: string | null
  status: string | null
  genres: Genre[]
  runtimeMinutes: number | null
  trailerKey: string | null
  budget: number | null
  revenue: number | null
  contentRating: string | null
  cast: CastMember[]
  crew: CrewMember[]
  backdrops: string[]
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

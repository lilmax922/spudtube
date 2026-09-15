import type { TmdbLanguage } from './types'

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export const DEFAULT_TMDB_LANGUAGE: TmdbLanguage = 'zh-TW'

// Abort-independent total budget for one TMDB fetch+JSON round trip. Timer-race
// reject, never abort-dependent: a tarpit socket in some runtimes never
// settles its fetch even after abort, so the timeout must fire on its own.
// Surfaces as TmdbApiError(504), which routes surface as 5xx (discover maps to
// 502) and the Nitro cached-handler validate() gate refuses to cache (code >= 400).
export const TMDB_FETCH_TIMEOUT_MS = 10_000

export const SEARCH_TTL_MS = 5 * 60 * 1000
export const LIST_TTL_MS = 6 * 60 * 60 * 1000
export const GENRE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const DETAIL_TTL_MS = 24 * 60 * 60 * 1000
export const NOT_FOUND_TTL_MS = 60 * 60 * 1000

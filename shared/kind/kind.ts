/**
 * Canonical Title kind (CONTEXT.md: Kind): exactly one of MOVIE | TV_SHOW.
 * Lives in shared so client and server name the same type without
 * deep-importing server paths. Server enum tables derive from KINDS.
 */
export const KINDS = ['MOVIE', 'TV_SHOW'] as const

export type Kind = (typeof KINDS)[number]

export type MediaSegment = 'movie' | 'tv'

/**
 * Single home for the Kind to TMDB path segment mapping. Both the server
 * TMDB module and the app helpers name the same segments from this seam so
 * a future Kind only changes one place.
 */
export function toMediaSegment(kind: Kind): MediaSegment {
  return kind === 'MOVIE' ? 'movie' : 'tv'
}

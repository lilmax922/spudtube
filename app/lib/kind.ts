import type { Kind } from '#server/tmdb/types'

export function toMediaSegment(kind: Kind): 'movie' | 'tv' {
  return kind === 'MOVIE' ? 'movie' : 'tv'
}

export function titleDetailPath(kind: Kind, tmdbId: number): string {
  return `/${toMediaSegment(kind)}/${tmdbId}`
}

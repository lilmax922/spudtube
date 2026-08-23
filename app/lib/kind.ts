import type { Kind } from '#server/tmdb/types'

export function toMediaSegment(kind: Kind): 'movie' | 'tv' {
  return kind === 'MOVIE' ? 'movie' : 'tv'
}

export function titleDetailPath(kind: Kind, tmdbId: number): string {
  return `/${toMediaSegment(kind)}/${tmdbId}`
}

export function kindLabelKey(kind: Kind): 'detail.kind.movie' | 'detail.kind.tv' {
  return kind === 'MOVIE' ? 'detail.kind.movie' : 'detail.kind.tv'
}

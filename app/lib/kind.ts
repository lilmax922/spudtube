import type { Kind } from '#shared/kind/kind'
import { toMediaSegment } from '#shared/kind/kind'

export { toMediaSegment }

export function titleDetailPath(kind: Kind, tmdbId: number): string {
  return `/${toMediaSegment(kind)}/${tmdbId}`
}

export function kindLabelKey(kind: Kind): 'detail.kind.movie' | 'detail.kind.tv' {
  return kind === 'MOVIE' ? 'detail.kind.movie' : 'detail.kind.tv'
}

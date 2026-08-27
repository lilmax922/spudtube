export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

// TMDB only serves each asset type at a fixed width ladder baked into the URL path;
// these ladders are the only resize candidates that exist, so srcset must be built from them.
const POSTER_LADDER = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780'] as const
const BACKDROP_LADDER = ['w780', 'w1280'] as const
const LOGO_LADDER = ['w45', 'w92', 'w154', 'w300'] as const

function ladderWidth(size: string): number {
  return Number.parseInt(size.slice(1), 10)
}

export function tmdbImageUrl(path: string | null, size: string): string | null {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null
}

export function tmdbSrcSet(path: string | null, ladder: readonly string[]): string | null {
  if (!path) {
    return null
  }
  return ladder
    .map(size => `${TMDB_IMAGE_BASE_URL}/${size}${path} ${ladderWidth(size)}w`)
    .join(', ')
}

export function posterUrl(path: string | null): string | null {
  return tmdbImageUrl(path, 'w500')
}

export function posterSrcSet(path: string | null): string | null {
  return tmdbSrcSet(path, POSTER_LADDER)
}

export function backdropUrl(path: string | null): string | null {
  return tmdbImageUrl(path, 'w1280')
}

export function backdropSrcSet(path: string | null): string | null {
  return tmdbSrcSet(path, BACKDROP_LADDER)
}

export function providerLogoUrl(path: string | null): string | null {
  return tmdbImageUrl(path, 'w92')
}

export function providerLogoSrcSet(path: string | null): string | null {
  return tmdbSrcSet(path, LOGO_LADDER)
}

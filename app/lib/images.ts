export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export const POSTER_SIZE = 'w500'
export const BACKDROP_SIZE = 'w1280'
export const PROVIDER_LOGO_SIZE = 'w92'

export function tmdbImageUrl(path: string | null, size: string): string | null {
  if (!path) {
    return null
  }
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

export function posterUrl(path: string | null): string | null {
  return tmdbImageUrl(path, POSTER_SIZE)
}

export function backdropUrl(path: string | null): string | null {
  return tmdbImageUrl(path, BACKDROP_SIZE)
}

export function providerLogoUrl(path: string | null): string | null {
  return tmdbImageUrl(path, PROVIDER_LOGO_SIZE)
}

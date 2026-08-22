export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export function posterUrl(path: string, size: 'w185' | 'w342' | 'w500' = 'w500'): string {
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`
}

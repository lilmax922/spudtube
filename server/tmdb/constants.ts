import type { TmdbLanguage } from './types'
import process from 'node:process'

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

// Test/dev-only seam for the socket-tarpit harness: when set, all TMDB
// traffic goes to the override origin instead. Never set in production;
// the diagnosis workflow removes this if reviewers consider it too broad.
function overrideBaseUrl(): string | undefined {
  try {
    const value = process.env.TMDB_BASE_URL_OVERRIDE?.trim()
    return value ? value.replace(/\/$/, '') : undefined
  }
  catch {
    return undefined
  }
}

export function resolveTmdbBaseUrl(): string {
  return overrideBaseUrl() ?? TMDB_BASE_URL
}

export const DEFAULT_TMDB_LANGUAGE: TmdbLanguage = 'zh-TW'

export const SEARCH_TTL_MS = 5 * 60 * 1000
export const DETAIL_TTL_MS = 24 * 60 * 60 * 1000
export const NOT_FOUND_TTL_MS = 60 * 60 * 1000

import type { TmdbLanguage } from './types'
import process from 'node:process'

export const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

// Test/dev-only seam for the socket-tarpit harness (see
// scripts/tarpit-harness.mjs): when set, all TMDB traffic goes to the
// override origin instead.
//
// Production guard: Cloudflare Pages sets CF_PAGES_BRANCH on every
// deployment and only the production branch serves real traffic, so the
// override is ignored (with a warning) there. A NODE_ENV check would be
// wrong here: Nitro builds all Pages environments with NODE_ENV=
// production, which would also disable the seam on previews where the
// harness legitimately runs.
function overrideBaseUrl(): string | undefined {
  try {
    const value = process.env.TMDB_BASE_URL_OVERRIDE?.trim()
    if (!value)
      return undefined
    if (process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH === 'main') {
      console.warn('[tmdb] ignoring TMDB_BASE_URL_OVERRIDE on production')
      return undefined
    }
    return value.replace(/\/$/, '')
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

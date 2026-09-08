import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveTmdbBaseUrl, TMDB_BASE_URL } from './constants'

const ENV_KEYS = ['TMDB_BASE_URL_OVERRIDE', 'CF_PAGES', 'CF_PAGES_BRANCH'] as const

function snapshotEnv(): Record<string, string | undefined> {
  return {
    TMDB_BASE_URL_OVERRIDE: process.env.TMDB_BASE_URL_OVERRIDE,
    CF_PAGES: process.env.CF_PAGES,
    CF_PAGES_BRANCH: process.env.CF_PAGES_BRANCH,
  }
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = snapshot[key]
    if (value === undefined)
      delete process.env[key]
    else process.env[key] = value
  }
}

describe('resolveTmdbBaseUrl', () => {
  const snapshot = snapshotEnv()

  afterEach(() => {
    restoreEnv(snapshot)
    vi.restoreAllMocks()
  })

  it('uses the production origin when no override is set', () => {
    delete process.env.TMDB_BASE_URL_OVERRIDE
    expect(resolveTmdbBaseUrl()).toBe(TMDB_BASE_URL)
  })

  it('honours the override outside production (local dev / previews)', () => {
    process.env.TMDB_BASE_URL_OVERRIDE = 'http://127.0.0.1:18099/'
    delete process.env.CF_PAGES
    delete process.env.CF_PAGES_BRANCH
    expect(resolveTmdbBaseUrl()).toBe('http://127.0.0.1:18099')
  })

  it('ignores the override with a warning on the production branch', () => {
    process.env.TMDB_BASE_URL_OVERRIDE = 'http://127.0.0.1:18099'
    process.env.CF_PAGES = '1'
    process.env.CF_PAGES_BRANCH = 'main'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveTmdbBaseUrl()).toBe(TMDB_BASE_URL)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('honours the override on non-production branches', () => {
    process.env.TMDB_BASE_URL_OVERRIDE = 'http://127.0.0.1:18099'
    process.env.CF_PAGES = '1'
    process.env.CF_PAGES_BRANCH = 'fix/tmdb-tarpit-hang'
    expect(resolveTmdbBaseUrl()).toBe('http://127.0.0.1:18099')
  })
})

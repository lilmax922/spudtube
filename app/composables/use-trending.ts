import type { ComputedRef, Ref } from 'vue'
import type { Page, TitleSummary, TmdbLanguage } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '../lib/kind'
import { useTmdbLanguage } from './use-tmdb-language'

export const TRENDING_TITLES_PER_KIND = 12
export const TRENDING_ALL_LIMIT = 12
export const TRENDING_CHIPS_LIMIT = 6

export interface TrendingFetcher {
  fetchTrending: (kind: Kind, language: TmdbLanguage) => Promise<Page<TitleSummary>>
}

export function createApiTrendingFetcher(): TrendingFetcher {
  return {
    fetchTrending(kind, language) {
      return $fetch<Page<TitleSummary>>(`/api/catalog/${toMediaSegment(kind)}/trending`, {
        query: { language, page: 1 },
      })
    },
  }
}

export interface TrendingState {
  movieTitles: Ref<TitleSummary[]>
  tvTitles: Ref<TitleSummary[]>
  allTitles: ComputedRef<TitleSummary[]>
  names: ComputedRef<string[]>
  loading: Ref<boolean>
  error: Ref<boolean>
  refresh: () => Promise<void>
}

// The catalog has no all-kinds endpoint, so the all tab interleaves both kinds
// on the client. TMDB exposes no trending-keywords endpoint either, so the
// trending titles double as the chips source: names are a projection of the
// same fetch, never a second one.
export function interleaveTitles(movies: TitleSummary[], shows: TitleSummary[], limit: number): TitleSummary[] {
  const merged: TitleSummary[] = []
  const half = Math.floor(limit / 2)
  for (let i = 0; i < half; i++) {
    if (movies[i])
      merged.push(movies[i]!)
    if (shows[i])
      merged.push(shows[i]!)
  }
  return merged
}

export function deriveTrendingNames(movies: TitleSummary[], shows: TitleSummary[], limit: number): string[] {
  const names: string[] = []
  const maxLen = Math.max(movies.length, shows.length)
  for (let i = 0; i < maxLen && names.length < limit; i++) {
    for (const title of [movies[i], shows[i]]) {
      if (names.length >= limit)
        break
      const name = title?.name?.trim()
      if (name && !names.includes(name))
        names.push(name)
    }
  }
  return names
}

export function useTrending(fetcher: TrendingFetcher = createApiTrendingFetcher()): TrendingState {
  const tmdbLanguage = useTmdbLanguage()

  const movieTitles = ref<TitleSummary[]>([])
  const tvTitles = ref<TitleSummary[]>([])
  const loading = ref(false)
  const error = ref(false)

  const allTitles = computed<TitleSummary[]>(() =>
    interleaveTitles(movieTitles.value, tvTitles.value, TRENDING_ALL_LIMIT),
  )
  const names = computed<string[]>(() =>
    deriveTrendingNames(movieTitles.value, tvTitles.value, TRENDING_CHIPS_LIMIT),
  )

  async function refresh(): Promise<void> {
    loading.value = true
    error.value = false
    try {
      const language = tmdbLanguage.value
      const [moviePage, tvPage] = await Promise.all([
        fetcher.fetchTrending('MOVIE', language).catch(() => null),
        fetcher.fetchTrending('TV_SHOW', language).catch(() => null),
      ])
      if (!moviePage && !tvPage) {
        error.value = true
        return
      }
      movieTitles.value = (moviePage?.results ?? []).slice(0, TRENDING_TITLES_PER_KIND)
      tvTitles.value = (tvPage?.results ?? []).slice(0, TRENDING_TITLES_PER_KIND)
    }
    catch {
      error.value = true
    }
    finally {
      loading.value = false
    }
  }

  void refresh()
  watch(tmdbLanguage, () => {
    void refresh()
  })

  return { movieTitles, tvTitles, allTitles, names, loading, error, refresh }
}

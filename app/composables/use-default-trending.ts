import type { ComputedRef, Ref } from 'vue'
import type { Page, TitleSummary, TmdbLanguage } from '#server/tmdb/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { $fetch } from '#imports'

export const DEFAULT_TRENDING_PER_KIND = 12
export const DEFAULT_TRENDING_ALL_LIMIT = 12

export interface DefaultTrendingState {
  movieTitles: Ref<TitleSummary[]>
  tvTitles: Ref<TitleSummary[]>
  allTitles: ComputedRef<TitleSummary[]>
  loading: Ref<boolean>
  error: Ref<boolean>
  refresh: () => Promise<void>
}

// Default search landing grid, fed by the weekly trending lists. The catalog
// has no all-kinds endpoint, so the all tab interleaves both kinds on the client.
export function useDefaultTrending(): DefaultTrendingState {
  let localeRef: Ref<string>
  try {
    localeRef = (useI18n().locale as unknown) as Ref<string>
  }
  catch {
    localeRef = ref('en')
  }
  const tmdbLanguage = computed<TmdbLanguage>(() =>
    localeRef.value === 'zh-TW' ? 'zh-TW' : 'en',
  )

  const movieTitles = ref<TitleSummary[]>([])
  const tvTitles = ref<TitleSummary[]>([])
  const loading = ref(false)
  const error = ref(false)

  const allTitles = computed<TitleSummary[]>(() => {
    const merged: TitleSummary[] = []
    const half = DEFAULT_TRENDING_ALL_LIMIT / 2
    const movies = movieTitles.value.slice(0, half)
    const shows = tvTitles.value.slice(0, half)
    for (let i = 0; i < half; i++) {
      if (movies[i])
        merged.push(movies[i]!)
      if (shows[i])
        merged.push(shows[i]!)
    }
    return merged
  })

  async function refresh(): Promise<void> {
    loading.value = true
    error.value = false
    try {
      const language = tmdbLanguage.value
      const [moviePage, tvPage] = await Promise.all([
        $fetch<Page<TitleSummary>>('/api/catalog/movie/trending', { query: { language, page: 1 } }).catch(() => null),
        $fetch<Page<TitleSummary>>('/api/catalog/tv/trending', { query: { language, page: 1 } }).catch(() => null),
      ])
      if (!moviePage && !tvPage) {
        error.value = true
        return
      }
      movieTitles.value = (moviePage?.results ?? []).slice(0, DEFAULT_TRENDING_PER_KIND)
      tvTitles.value = (tvPage?.results ?? []).slice(0, DEFAULT_TRENDING_PER_KIND)
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

  return { movieTitles, tvTitles, allTitles, loading, error, refresh }
}

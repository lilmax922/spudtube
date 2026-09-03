import type { Ref } from 'vue'
import type { Page, TitleSummary, TmdbLanguage } from '#server/tmdb/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { $fetch } from '#imports'

// Shared by the search page landing and the header overlay: movie top 3 +
// tv top 3, interleaved. TMDB exposes no trending-keywords endpoint, so
// trending titles double as the chips source.
export const TRENDING_CHIPS_LIMIT = 6

export interface TrendingNamesState {
  names: Ref<string[]>
  loading: Ref<boolean>
  error: Ref<boolean>
  refresh: () => Promise<void>
}

export function useTrendingNames(): TrendingNamesState {
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

  const names = ref<string[]>([])
  const loading = ref(false)
  const error = ref(false)

  async function refresh(): Promise<void> {
    loading.value = true
    error.value = false
    try {
      const language = tmdbLanguage.value
      const [moviePage, tvPage] = await Promise.all([
        $fetch<Page<TitleSummary>>('/api/catalog/movie/trending', { query: { language, page: 1 } }).catch(() => null),
        $fetch<Page<TitleSummary>>('/api/catalog/tv/trending', { query: { language, page: 1 } }).catch(() => null),
      ])
      const movieNames = moviePage?.results.map((r: TitleSummary) => r.name).filter(Boolean) ?? []
      const tvNames = tvPage?.results.map((r: TitleSummary) => r.name).filter(Boolean) ?? []
      const merged: string[] = []
      const maxLen = Math.max(movieNames.length, tvNames.length)
      for (let i = 0; i < maxLen && merged.length < TRENDING_CHIPS_LIMIT; i++) {
        if (movieNames[i])
          merged.push(movieNames[i]!)
        if (merged.length >= TRENDING_CHIPS_LIMIT)
          break
        if (tvNames[i])
          merged.push(tvNames[i]!)
      }
      if (merged.length < TRENDING_CHIPS_LIMIT) {
        const extra = [...movieNames.slice(merged.filter((_, idx) => idx % 2 === 0).length), ...tvNames.slice(merged.filter((_, idx) => idx % 2 === 1).length)]
        for (const n of extra) {
          if (merged.length >= TRENDING_CHIPS_LIMIT)
            break
          if (!merged.includes(n))
            merged.push(n)
        }
      }
      names.value = merged.slice(0, TRENDING_CHIPS_LIMIT)
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

  return { names, loading, error, refresh }
}

import type { Ref } from 'vue'
import type { Kind, Page, TitleSummary, TmdbLanguage } from '#server/tmdb/types'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { $fetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

const HERO_LIMIT = 5

export interface HeroFetcher {
  fetchTrending: (kind: Kind, page: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
}

export function createApiHeroFetcher(): HeroFetcher {
  return {
    fetchTrending(kind, page, language) {
      return $fetch<Page<TitleSummary>>(`/api/catalog/${toMediaSegment(kind)}/trending`, {
        query: { page, ...(language ? { language } : {}) },
      })
    },
  }
}

export interface HeroTitlesState {
  titles: Ref<TitleSummary[]>
  loading: Ref<boolean>
  error: Ref<boolean>
}

let heroInstance: HeroTitlesState | undefined

export function useHeroTitles(kind: Ref<Kind>, fetcher?: HeroFetcher): HeroTitlesState {
  const isDefault = fetcher === undefined
  if (isDefault && heroInstance)
    return heroInstance
  const actualFetcher = fetcher ?? createApiHeroFetcher()
  let localeRef: Ref<string>
  try {
    localeRef = (useI18n().locale as unknown) as Ref<string>
  }
  catch {
    localeRef = ref('en') as Ref<string>
  }
  const titles = ref<TitleSummary[]>([])
  const loading = ref(false)
  const error = ref(false)
  let generation = 0

  async function load(): Promise<void> {
    const current = ++generation
    loading.value = true
    error.value = false
    try {
      const page = await actualFetcher.fetchTrending(kind.value, 1, localeRef.value as TmdbLanguage)
      if (current !== generation)
        return
      // Sort by vote average so the highest-rated title leads the carousel.
      const sorted = [...page.results].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
      titles.value = sorted.slice(0, HERO_LIMIT)
    }
    catch {
      if (current === generation)
        error.value = true
    }
    finally {
      if (current === generation)
        loading.value = false
    }
  }

  // Refetch when the kind or locale flips; the hero never reacts to user filters, only to the
  // current catalog and display language.
  void load()
  watch([kind, localeRef], () => {
    void load()
  })

  const state: HeroTitlesState = { titles, loading, error }
  if (isDefault)
    heroInstance = state
  return state
}

// Test-only escape hatch to reset the singleton between tests.
export function resetHeroTitlesForTest(): void {
  heroInstance = undefined
}

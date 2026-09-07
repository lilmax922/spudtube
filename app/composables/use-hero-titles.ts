import type { ComputedRef, Ref } from 'vue'
import type { HeroPayload } from '#server/api/catalog/[kind]/hero.get'
import type { TmdbLanguage } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { ref, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '#shared/kind/kind'
import { useTmdbLanguage } from './use-tmdb-language'

export interface HeroTitle {
  kind: 'MOVIE' | 'TV_SHOW'
  tmdbId: number
  name: string
  posterPath: string | null
  backdropPath: string | null
  releaseDate: string | null
  voteAverage: number | null
  overview: string | null
  runtimeMinutes: number | null
  contentRating: string | null
  genres: { id: number, name: string }[]
  providers: { id: number, name: string, logoPath: string | null }[]
}

export interface HeroFetcher {
  fetchHero: (kind: Kind, language?: TmdbLanguage) => Promise<HeroPayload>
}

export function createApiHeroFetcher(): HeroFetcher {
  return {
    fetchHero(kind, language) {
      return $fetch<HeroPayload>(`/api/catalog/${toMediaSegment(kind)}/hero`, {
        query: { ...(language ? { language } : {}) },
      })
    },
  }
}

export interface HeroTitlesState {
  titles: Ref<HeroTitle[]>
  loading: Ref<boolean>
  error: Ref<boolean>
  refresh: () => Promise<void>
}

let heroInstance: HeroTitlesState | undefined
let heroFetcher: HeroFetcher | undefined
let heroObservedKind: Ref<'MOVIE' | 'TV_SHOW'> | undefined
let heroObservedLocale: ComputedRef<TmdbLanguage> | undefined
let heroGeneration = 0
let heroLoadedKind: 'MOVIE' | 'TV_SHOW' | undefined
let heroLoadedLanguage: TmdbLanguage | undefined
let heroTestFetcher: HeroFetcher | undefined

function resolveLocaleRef(): ComputedRef<TmdbLanguage> {
  return useTmdbLanguage()
}

function mapHeroPayload(payload: HeroPayload): HeroTitle[] {
  return payload.results.map(r => ({
    kind: r.kind,
    tmdbId: r.tmdbId,
    name: r.name,
    posterPath: r.posterPath,
    backdropPath: r.backdropPath,
    releaseDate: r.releaseDate,
    voteAverage: r.voteAverage,
    overview: r.overview ?? null,
    runtimeMinutes: r.runtimeMinutes,
    contentRating: r.contentRating,
    genres: r.genres,
    providers: r.providers,
  }))
}

// Single-flight reload for the shared instance. Generation guards stale
// responses when kind flips twice before the first fetch resolves. The loaded
// markers move only on success so a failed first fetch retries on remount.
async function reloadSharedHero(): Promise<void> {
  const state = heroInstance
  const fetcher = heroTestFetcher ?? heroFetcher
  const kindRef = heroObservedKind
  const tmdbLanguage = heroObservedLocale
  if (!state || !fetcher || !kindRef || !tmdbLanguage)
    return
  const current = ++heroGeneration
  const kindValue = kindRef.value
  const languageValue = tmdbLanguage.value
  state.loading.value = true
  state.error.value = false
  try {
    const payload = await fetcher.fetchHero(kindValue, languageValue)
    if (current !== heroGeneration)
      return
    state.titles.value = mapHeroPayload(payload)
    heroLoadedKind = kindValue
    heroLoadedLanguage = tmdbLanguage.value
  }
  catch {
    if (current === heroGeneration)
      state.error.value = true
  }
  finally {
    if (current === heroGeneration)
      state.loading.value = false
  }
}

export function useHeroTitles(kind: Ref<'MOVIE' | 'TV_SHOW'>, fetcher?: HeroFetcher): HeroTitlesState {
  if (fetcher !== undefined) {
    const actualFetcher: HeroFetcher = fetcher
    const tmdbLanguage = resolveLocaleRef()
    const titles = ref<HeroTitle[]>([])
    const loading = ref(false)
    const error = ref(false)
    let generation = 0

    async function load(): Promise<void> {
      const current = ++generation
      loading.value = true
      error.value = false
      try {
        const payload = await actualFetcher.fetchHero(kind.value, tmdbLanguage.value)
        if (current !== generation)
          return
        titles.value = mapHeroPayload(payload)
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

    void load()
    watch([kind, tmdbLanguage], () => {
      void load()
    })

    return { titles, loading, error, refresh: load }
  }

  // Shared singleton path used by the landing page. The watcher binds to the
  // calling scope, so every mount re-registers it and resyncs when kind or
  // locale drifted while the page was unmounted (for example setKind from
  // the header on another page before navigating home).
  const tmdbLanguage = resolveLocaleRef()
  if (heroInstance) {
    heroObservedKind = kind
    heroObservedLocale = tmdbLanguage
    watch([heroObservedKind, heroObservedLocale], () => {
      void reloadSharedHero()
    })
    if (heroLoadedKind !== kind.value || heroLoadedLanguage !== tmdbLanguage.value)
      void reloadSharedHero()
    return heroInstance
  }
  heroFetcher = heroTestFetcher ?? createApiHeroFetcher()
  heroObservedKind = kind
  heroObservedLocale = tmdbLanguage
  const titles = ref<HeroTitle[]>([])
  const loading = ref(false)
  const error = ref(false)
  heroInstance = { titles, loading, error, refresh: reloadSharedHero }
  watch([heroObservedKind, heroObservedLocale], () => {
    void reloadSharedHero()
  })
  void reloadSharedHero()
  return heroInstance
}

export function resetHeroTitlesForTest(): void {
  heroInstance = undefined
  heroFetcher = undefined
  heroObservedKind = undefined
  heroObservedLocale = undefined
  heroGeneration = 0
  heroLoadedKind = undefined
  heroLoadedLanguage = undefined
  heroTestFetcher = undefined
}

export function setHeroTitlesFetcherForTest(fetcher: HeroFetcher | undefined): void {
  heroTestFetcher = fetcher
}

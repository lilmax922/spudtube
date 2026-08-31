import type { Ref } from 'vue'
import type { HeroPayload } from '#server/api/catalog/[kind]/hero.get'
import type { Kind, TmdbLanguage } from '#server/tmdb/types'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { $fetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

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
}

let heroInstance: HeroTitlesState | undefined

export function useHeroTitles(kind: Ref<'MOVIE' | 'TV_SHOW'>, fetcher?: HeroFetcher): HeroTitlesState {
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
  const titles = ref<HeroTitle[]>([])
  const loading = ref(false)
  const error = ref(false)
  let generation = 0

  async function load(): Promise<void> {
    const current = ++generation
    loading.value = true
    error.value = false
    try {
      const payload = await actualFetcher.fetchHero(kind.value, localeRef.value as TmdbLanguage)
      if (current !== generation)
        return
      titles.value = payload.results.map(r => ({
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
  watch([kind, localeRef], () => {
    void load()
  })

  const state: HeroTitlesState = { titles, loading, error }
  if (isDefault)
    heroInstance = state
  return state
}

export function resetHeroTitlesForTest(): void {
  heroInstance = undefined
}

import type { ComputedRef, Ref } from 'vue'
import type { HeroPayload } from '#server/api/catalog/[kind]/hero.get'
import type { TmdbLanguage } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import type { Region } from '#shared/region/region'
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '#shared/kind/kind'
import { DEFAULT_REGION } from '#shared/region/region'
import { useRegion } from './use-region'
import { clearSsrDataForTest, useSsrData } from './use-ssr-data'
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
let heroInstanceKey: string | undefined
let heroFetcher: HeroFetcher | undefined
let heroTestFetcher: HeroFetcher | undefined

function resolveLocaleRef(): ComputedRef<TmdbLanguage> {
  return useTmdbLanguage()
}

function resolveRegionRef(): ComputedRef<Region> {
  try {
    return useRegion().region
  }
  catch {
    return computed(() => DEFAULT_REGION)
  }
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

// Shared hero state is SSR-tracked under kind + language: the server awaits
// it before painting, and the payload seeds hydration, so both sides render
// the same hero instead of racing a skeleton against the carousel. A context
// change selects the entry for the new combination and fetches it, which
// also resyncs remounts after a drift (for example setKind from the header
// while home was unmounted) without any remount bookkeeping here.

export function useHeroTitles(kind: Ref<'MOVIE' | 'TV_SHOW'>, fetcher?: HeroFetcher): HeroTitlesState {
  if (fetcher !== undefined) {
    const actualFetcher: HeroFetcher = fetcher
    const tmdbLanguage = resolveLocaleRef()
    const region = resolveRegionRef()
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
    watch([kind, tmdbLanguage, region], () => {
      void load()
    })

    return { titles, loading, error, refresh: load }
  }

  // Shared singleton path used by the landing page. The instance is shared
  // on the client only: reusing it across SSR requests would paint one
  // visitor's hero into another's HTML and mismatch hydration. Remounts
  // with an unchanged context reuse the settled combination without
  // refetching; a drifted context selects the entry for the new combination
  // and fetches it, so no remount bookkeeping is needed beyond the key.
  // Region is not part of the key: hero content never varies by region, so
  // a region switch correctly leaves the settled hero alone.
  const tmdbLanguage = resolveLocaleRef()
  const entryKey = `spud:hero:${kind.value}:${tmdbLanguage.value}`
  if (!import.meta.server && heroInstance && heroInstanceKey === entryKey) {
    watch([kind, tmdbLanguage], () => {
      void heroInstance?.refresh()
    })
    void heroInstance.refresh()
    return heroInstance
  }
  // The fetcher itself is stateless, so sharing it across SSR requests is
  // safe; only the loaded titles stay per-request through the keyed entry.
  const sharedFetcher = (): HeroFetcher => heroTestFetcher ?? (heroFetcher ??= createApiHeroFetcher())
  const remote = useSsrData<HeroPayload>(
    'spud:hero',
    () => ({ kind: kind.value, lang: tmdbLanguage.value }),
    () => sharedFetcher().fetchHero(kind.value, tmdbLanguage.value),
  )
  const titles: Ref<HeroTitle[]> = computed<HeroTitle[]>(() => remote.data.value ? mapHeroPayload(remote.data.value) : [])
  const loading: Ref<boolean> = computed<boolean>(() => remote.pending.value)
  const error: Ref<boolean> = computed<boolean>(() => remote.failed.value)
  async function refreshShared(): Promise<void> {
    await remote.ensure()
  }
  const state: HeroTitlesState = { titles, loading, error, refresh: refreshShared }
  if (!import.meta.server) {
    heroInstance = state
    heroInstanceKey = entryKey
  }
  watch([kind, tmdbLanguage], () => {
    void state.refresh()
  })
  void state.refresh()
  return state
}

export function resetHeroTitlesForTest(): void {
  heroInstance = undefined
  heroInstanceKey = undefined
  heroFetcher = undefined
  heroTestFetcher = undefined
  clearSsrDataForTest()
}

export function setHeroTitlesFetcherForTest(fetcher: HeroFetcher | undefined): void {
  heroTestFetcher = fetcher
}

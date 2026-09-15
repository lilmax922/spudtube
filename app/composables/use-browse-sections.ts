import type { Ref } from 'vue'
import type { BrowseSection } from '#server/api/browse/sections.get'
import type { TmdbLanguage } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { computed, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '#shared/kind/kind'
import { useSsrData } from './use-ssr-data'
import { useTmdbLanguage } from './use-tmdb-language'

export interface SectionsFetcher {
  fetchSections: (kind: Kind, language: TmdbLanguage) => Promise<BrowseSection[]>
}

export function createApiSectionsFetcher(): SectionsFetcher {
  return {
    async fetchSections(kind, language) {
      const payload = await $fetch<{ sections: BrowseSection[] }>('/api/browse/sections', {
        query: { kind: toMediaSegment(kind), language },
      })
      return payload.sections
    },
  }
}

export interface BrowseSectionsState {
  sections: Ref<BrowseSection[]>
  loading: Ref<boolean>
  error: Ref<boolean>
  refresh: () => Promise<void>
}

export function useBrowseSections(kind: Ref<Kind>, fetcher: SectionsFetcher = createApiSectionsFetcher()): BrowseSectionsState {
  const tmdbLanguage = useTmdbLanguage()

  // The rows are SSR-tracked under kind + language: the server awaits them
  // before painting, and the payload seeds hydration, so both sides render
  // the same rows instead of racing a skeleton against content. A key change
  // rebuilds and refetches the entry on its own; settled rows stay on
  // screen while the reload runs, so a setup refresh never flashes a
  // skeleton over server-rendered rows.
  const remote = useSsrData<BrowseSection[]>(
    'spud:sections',
    () => ({ kind: kind.value, lang: tmdbLanguage.value }),
    () => fetcher.fetchSections(kind.value, tmdbLanguage.value),
  )

  const sections: Ref<BrowseSection[]> = computed<BrowseSection[]>(() => remote.data.value ?? [])
  const loading: Ref<boolean> = computed<boolean>(() => remote.pending.value)
  const error: Ref<boolean> = computed<boolean>(() => remote.failed.value)

  async function refresh(): Promise<void> {
    await remote.reload()
  }

  watch([kind, tmdbLanguage], () => {
    void refresh()
  })

  return { sections, loading, error, refresh }
}

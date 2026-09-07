import type { Ref } from 'vue'
import type { BrowseSection } from '#server/api/browse/sections.get'
import type { TmdbLanguage } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { ref, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '../lib/kind'
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

  const sections = ref<BrowseSection[]>([])
  const loading = ref(false)
  const error = ref(false)

  async function refresh(): Promise<void> {
    loading.value = true
    error.value = false
    try {
      sections.value = await fetcher.fetchSections(kind.value, tmdbLanguage.value)
    }
    catch {
      error.value = true
    }
    finally {
      loading.value = false
    }
  }

  watch([kind, tmdbLanguage], () => {
    void refresh()
  })

  return { sections, loading, error, refresh }
}

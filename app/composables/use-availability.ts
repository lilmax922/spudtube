import type { ComputedRef } from 'vue'
import type { AsyncData, NuxtError } from '#app'
import type { ProviderCatalog } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { computed } from 'vue'
import { useFetch } from '#imports'
import { toMediaSegment } from '../lib/kind'
import { useTmdbLanguage } from './use-tmdb-language'

export interface AvailabilityOptions {
  /** Cards defer the request until the title is actually inspected. */
  immediate?: boolean
}

export interface AvailabilityData {
  catalog: AsyncData<ProviderCatalog | undefined, NuxtError | undefined>
  loadCatalog: () => Promise<void>
}

export function useAvailability(kind: Kind, tmdbId: number | ComputedRef<number | null>, options: AvailabilityOptions = {}): AvailabilityData {
  const { immediate = true } = options
  const tmdbLanguage = useTmdbLanguage()
  const idRef = typeof tmdbId === 'number' ? computed(() => tmdbId) : tmdbId
  const catalog = useFetch<ProviderCatalog>(
    computed(() => {
      const id = idRef.value
      if (id == null || id === 0)
        return ''
      return `/api/catalog/${toMediaSegment(kind)}/${id}/providers`
    }),
    {
      query: { language: tmdbLanguage },
      watch: [tmdbLanguage, idRef],
      key: computed(() => `providers:${kind}:${idRef.value ?? 'pending'}:${tmdbLanguage.value}`),
      immediate,
    },
  )
  return { catalog, loadCatalog }

  async function loadCatalog(): Promise<void> {
    try {
      await catalog.execute()
    }
    catch {
      // Hover-only enrichment stays silent on failure; the strip simply never appears.
    }
  }
}

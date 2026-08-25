import type { ComputedRef, Ref } from 'vue'
import type { AsyncData, NuxtError } from '#app'
import type { Kind, ProviderCatalog } from '#server/tmdb/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

export interface AvailabilityData {
  catalog: AsyncData<ProviderCatalog | undefined, NuxtError | undefined>
}

export function useAvailability(kind: Kind, tmdbId: number | ComputedRef<number | null>): AvailabilityData {
  let localeRef: Ref<string>
  try {
    localeRef = (useI18n().locale as unknown) as Ref<string>
  }
  catch {
    localeRef = ref('en') as Ref<string>
  }
  const idRef = typeof tmdbId === 'number' ? computed(() => tmdbId) : tmdbId
  const catalog = useFetch<ProviderCatalog>(
    computed(() => {
      const id = idRef.value
      if (id == null || id === 0)
        return ''
      return `/api/catalog/${toMediaSegment(kind)}/${id}/providers`
    }),
    {
      query: { language: localeRef },
      watch: [localeRef, idRef],
      key: computed(() => `providers:${kind}:${idRef.value ?? 'pending'}:${localeRef.value}`),
      immediate: true,
      server: true,
    },
  )
  return { catalog }
}

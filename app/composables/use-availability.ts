import type { Ref } from 'vue'
import type { AsyncData, NuxtError } from '#app'
import type { Kind, ProviderCatalog } from '#server/tmdb/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

export interface AvailabilityData {
  catalog: AsyncData<ProviderCatalog | undefined, NuxtError | undefined>
}

export function useAvailability(kind: Kind, tmdbId: number): AvailabilityData {
  let localeRef: Ref<string>
  try {
    localeRef = (useI18n().locale as unknown) as Ref<string>
  }
  catch {
    localeRef = ref('en') as Ref<string>
  }
  const catalog = useFetch<ProviderCatalog>(
    computed(() => `/api/catalog/${toMediaSegment(kind)}/${tmdbId}/providers`),
    {
      query: { language: localeRef },
      watch: [localeRef],
      key: computed(() => `providers:${kind}:${tmdbId}:${localeRef.value}`),
    },
  )
  return { catalog }
}

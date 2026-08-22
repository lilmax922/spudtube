import type { AsyncData, NuxtError } from '#app'
import type { Kind, ProviderCatalog } from '#server/tmdb/types'
import { useFetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

export interface AvailabilityData {
  catalog: AsyncData<ProviderCatalog | undefined, NuxtError | undefined>
}

export function useAvailability(kind: Kind, tmdbId: number): AvailabilityData {
  const catalog = useFetch<ProviderCatalog>(
    `/api/catalog/${toMediaSegment(kind)}/${tmdbId}/providers`,
  )
  return { catalog }
}

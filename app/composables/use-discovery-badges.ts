import type { AsyncData, NuxtError } from '#app'
import type { DiscoveryBadges } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { computed } from 'vue'
import { useFetch } from '#imports'
import { toMediaSegment } from '#shared/kind/kind'
import { useTmdbLanguage } from './use-tmdb-language'

export interface DiscoveryBadgesData {
  badges: AsyncData<DiscoveryBadges | undefined, NuxtError | undefined>
}

export function useDiscoveryBadges(kind: Kind): DiscoveryBadgesData {
  const tmdbLanguage = useTmdbLanguage()
  const badges = useFetch<DiscoveryBadges>(
    computed(() => `/api/catalog/${toMediaSegment(kind)}/discovery-badges`),
    {
      query: { language: tmdbLanguage },
      watch: [tmdbLanguage],
      key: computed(() => `discovery-badges:${kind}:${tmdbLanguage.value}`),
    },
  )
  return { badges }
}

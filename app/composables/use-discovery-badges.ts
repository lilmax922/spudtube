import type { Ref } from 'vue'
import type { AsyncData, NuxtError } from '#app'
import type { DiscoveryBadges, Kind } from '#server/tmdb/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

export interface DiscoveryBadgesData {
  badges: AsyncData<DiscoveryBadges | undefined, NuxtError | undefined>
}

export function useDiscoveryBadges(kind: Kind): DiscoveryBadgesData {
  let localeRef: Ref<string>
  try {
    localeRef = (useI18n().locale as unknown) as Ref<string>
  }
  catch {
    localeRef = ref('en') as Ref<string>
  }
  const badges = useFetch<DiscoveryBadges>(
    computed(() => `/api/catalog/${toMediaSegment(kind)}/discovery-badges`),
    {
      query: { language: localeRef },
      watch: [localeRef],
      key: computed(() => `discovery-badges:${kind}:${localeRef.value}`),
    },
  )
  return { badges }
}

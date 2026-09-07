import type { Ref } from 'vue'
import type { AsyncData, NuxtError } from '#app'
import type { Page, TitleDetail, TitleSummary } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { computed } from 'vue'
import { useFetch } from '#imports'
import { toMediaSegment } from '#shared/kind/kind'
import { useTmdbLanguage } from './use-tmdb-language'

export interface TitleDetailData {
  detail: AsyncData<TitleDetail | null | undefined, NuxtError | undefined>
  recommendations: AsyncData<Page<TitleSummary> | undefined, NuxtError | undefined>
}

export function useTitleDetail(kind: Kind, id: Ref<string | string[]>): TitleDetailData {
  const segment = toMediaSegment(kind)
  const rawId = computed(() => (Array.isArray(id.value) ? id.value[0] ?? '' : id.value))
  const baseUrl = computed(() => `/api/catalog/${segment}/${rawId.value}`)
  const tmdbLanguage = useTmdbLanguage()
  const detail = useFetch<TitleDetail | null>(baseUrl, {
    query: { language: tmdbLanguage },
    watch: [tmdbLanguage],
    key: computed(() => `title-detail:${segment}:${rawId.value}:${tmdbLanguage.value}`),
  })
  const recommendations = useFetch<Page<TitleSummary>>(
    computed(() => `${baseUrl.value}/recommendations`),
    {
      query: { language: tmdbLanguage },
      watch: [tmdbLanguage],
      key: computed(() => `title-recommendations:${segment}:${rawId.value}:${tmdbLanguage.value}`),
    },
  )
  return { detail, recommendations }
}

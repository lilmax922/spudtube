import type { Ref } from 'vue'
import type { AsyncData, NuxtError } from '#app'
import type { Kind, Page, TitleDetail, TitleSummary } from '#server/tmdb/types'
import { computed } from 'vue'
import { useFetch } from '#imports'
import { toMediaSegment } from '../lib/kind'

export interface TitleDetailData {
  detail: AsyncData<TitleDetail | null | undefined, NuxtError | undefined>
  recommendations: AsyncData<Page<TitleSummary> | undefined, NuxtError | undefined>
}

export function useTitleDetail(kind: Kind, id: Ref<string | string[]>): TitleDetailData {
  const segment = toMediaSegment(kind)
  const rawId = computed(() => (Array.isArray(id.value) ? id.value[0] ?? '' : id.value))
  const baseUrl = computed(() => `/api/catalog/${segment}/${rawId.value}`)
  const detail = useFetch<TitleDetail | null>(baseUrl)
  const recommendations = useFetch<Page<TitleSummary>>(
    computed(() => `${baseUrl.value}/recommendations`),
  )
  return { detail, recommendations }
}

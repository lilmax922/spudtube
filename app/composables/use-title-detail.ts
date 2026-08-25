import type { Ref } from 'vue'
import type { AsyncData, NuxtError } from '#app'
import type { Kind, Page, TitleDetail, TitleSummary } from '#server/tmdb/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
  let localeRef: Ref<string>
  try {
    localeRef = (useI18n().locale as unknown) as Ref<string>
  }
  catch {
    localeRef = ref('en') as Ref<string>
  }
  const detail = useFetch<TitleDetail | null>(baseUrl, {
    query: { language: localeRef },
    watch: [localeRef],
    key: computed(() => `title-detail:${segment}:${rawId.value}:${localeRef.value}`),
  })
  const recommendations = useFetch<Page<TitleSummary>>(
    computed(() => `${baseUrl.value}/recommendations`),
    {
      query: { language: localeRef },
      watch: [localeRef],
      key: computed(() => `title-recommendations:${segment}:${rawId.value}:${localeRef.value}`),
    },
  )
  return { detail, recommendations }
}

import type { Ref } from 'vue'
import type { BrowseSectionsPayload } from '#server/api/browse/sections.get'
import type { Kind, TmdbLanguage } from '#server/tmdb/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { $fetch } from '#imports'
import { toMediaSegment } from '../lib/kind'
import { useBrowseGrid } from './use-browse-grid'

export interface BrowseSectionsState {
  sections: Ref<BrowseSectionsPayload['sections']>
  loading: Ref<boolean>
  error: Ref<boolean>
  refresh: () => Promise<void>
}

async function fetchSections(
  kind: Kind,
  language: TmdbLanguage,
): Promise<BrowseSectionsPayload['sections']> {
  const payload = await $fetch<BrowseSectionsPayload>('/api/browse/sections', {
    query: { kind: toMediaSegment(kind), language },
  })
  return payload.sections
}

export function useBrowseSections(): BrowseSectionsState {
  const { kind } = useBrowseGrid()
  let localeRef: Ref<string>
  try {
    localeRef = (useI18n().locale as unknown) as Ref<string>
  }
  catch {
    localeRef = ref('en') as Ref<string>
  }
  const tmdbLanguage = computed<TmdbLanguage>(() =>
    localeRef.value === 'zh-TW' ? 'zh-TW' : 'en',
  )

  const sections = ref<BrowseSectionsPayload['sections']>([])
  const loading = ref(false)
  const error = ref(false)

  async function refresh(): Promise<void> {
    loading.value = true
    error.value = false
    try {
      sections.value = await fetchSections(kind.value, tmdbLanguage.value)
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

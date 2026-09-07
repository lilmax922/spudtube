import type { ComputedRef, Ref } from 'vue'
import type { TmdbLanguage } from '#server/tmdb/types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

// Single home for the DisplayLocale-to-TMDB-language mapping: zh-TW stays,
// everything else falls back to en. Replaces the try/catch locale preamble
// previously copied across every listing composable.
export function useTmdbLanguage(): ComputedRef<TmdbLanguage> {
  let localeRef: Ref<string>
  try {
    localeRef = (useI18n().locale as unknown) as Ref<string>
  }
  catch {
    localeRef = ref('en')
  }
  return computed<TmdbLanguage>(() =>
    localeRef.value === 'zh-TW' ? 'zh-TW' : 'en',
  )
}

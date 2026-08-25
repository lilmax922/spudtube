import type { ComputedRef, Ref } from 'vue'
import type { Page, TitleSummary, TmdbLanguage } from '#server/tmdb/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { $fetch } from '#imports'
import { usePagedResults } from './use-paged-results'

export interface SearchFetcher {
  fetchSearch: (query: string, page: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
}

export function createApiSearchFetcher(): SearchFetcher {
  return {
    fetchSearch(query, page, language) {
      return $fetch<Page<TitleSummary>>('/api/catalog/search', {
        query: {
          query,
          page,
          ...(language ? { language } : {}),
        },
      })
    },
  }
}

export interface KeywordSearchState {
  query: Ref<string>
  searchedQuery: Ref<string>
  mode: ComputedRef<'browse' | 'search'>
  items: Ref<TitleSummary[]>
  page: Ref<number>
  totalPages: Ref<number>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  error: Ref<boolean>
  hasMore: ComputedRef<boolean>
  search: (query: string) => Promise<void>
  loadMore: () => Promise<void>
  clear: () => void
}

export function useKeywordSearch(fetcher: SearchFetcher = createApiSearchFetcher()): KeywordSearchState {
  const query = ref('')
  const searchedQuery = ref('')
  const mode = computed(() => (searchedQuery.value === '' ? 'browse' : 'search'))
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
  const { loadFirstPage, loadNextPage, reset, ...paged } = usePagedResults<TitleSummary>(page =>
    fetcher.fetchSearch(searchedQuery.value, page, tmdbLanguage.value),
  )

  watch(tmdbLanguage, () => {
    if (searchedQuery.value !== '') {
      void loadFirstPage()
    }
  })

  async function search(nextQuery: string): Promise<void> {
    const trimmed = nextQuery.trim()
    if (trimmed === '') {
      clear()
      return
    }
    query.value = trimmed
    searchedQuery.value = trimmed
    await loadFirstPage()
  }

  function clear(): void {
    query.value = ''
    searchedQuery.value = ''
    reset()
  }

  return {
    ...paged,
    query,
    searchedQuery,
    mode,
    search,
    loadMore: loadNextPage,
    clear,
  }
}

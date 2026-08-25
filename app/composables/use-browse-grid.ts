import type { ComputedRef, Ref } from 'vue'
import type { Genre, Kind, Page, TitleSummary, TmdbLanguage } from '#server/tmdb/types'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { $fetch } from '#imports'
import { usePagedResults } from './use-paged-results'

const KIND_SEGMENT: Record<Kind, 'movie' | 'tv'> = {
  MOVIE: 'movie',
  TV_SHOW: 'tv',
}

export interface BrowseFetcher {
  fetchGenres: (kind: Kind, language?: TmdbLanguage) => Promise<Genre[]>
  fetchDiscover: (kind: Kind, genreIds: number[], page: number, language?: TmdbLanguage) => Promise<Page<TitleSummary>>
}

export function createApiBrowseFetcher(): BrowseFetcher {
  return {
    fetchGenres(kind, language) {
      return $fetch<Genre[]>('/api/catalog/genres', {
        query: {
          kind: KIND_SEGMENT[kind],
          ...(language ? { language } : {}),
        },
      })
    },
    fetchDiscover(kind, genreIds, page, language) {
      return $fetch<Page<TitleSummary>>('/api/catalog/discover', {
        query: {
          kind: KIND_SEGMENT[kind],
          ...(genreIds.length > 0 ? { genres: genreIds.join(',') } : {}),
          page,
          ...(language ? { language } : {}),
        },
      })
    },
  }
}

export interface BrowseGridState {
  kind: Ref<Kind>
  selectedGenreIds: Ref<number[]>
  genres: Ref<Genre[]>
  items: Ref<TitleSummary[]>
  page: Ref<number>
  totalPages: Ref<number>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  error: Ref<boolean>
  hasMore: ComputedRef<boolean>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setKind: (kind: Kind) => void
  toggleGenre: (genreId: number) => void
  clearGenres: () => void
}

export function useBrowseGrid(fetcher: BrowseFetcher = createApiBrowseFetcher()): BrowseGridState {
  const kind = ref<Kind>('MOVIE')
  const selectedGenreIds = ref<number[]>([])
  const genres = ref<Genre[]>([])
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
  const { loadFirstPage, loadNextPage, ...paged } = usePagedResults<TitleSummary>(page =>
    fetcher.fetchDiscover(kind.value, selectedGenreIds.value, page, tmdbLanguage.value),
  )

  async function refresh(): Promise<void> {
    try {
      const [genreList, applied] = await Promise.all([
        fetcher.fetchGenres(kind.value, tmdbLanguage.value),
        loadFirstPage(),
      ])
      if (applied)
        genres.value = genreList
    }
    catch {
      paged.markFailed(paged.attempt())
    }
  }

  watch(tmdbLanguage, () => {
    void refresh()
  })

  function setKind(next: Kind): void {
    if (next === kind.value)
      return
    kind.value = next
    selectedGenreIds.value = []
    void refresh()
  }

  function toggleGenre(genreId: number): void {
    selectedGenreIds.value = selectedGenreIds.value.includes(genreId)
      ? selectedGenreIds.value.filter(id => id !== genreId)
      : [...selectedGenreIds.value, genreId]
    void refresh()
  }

  function clearGenres(): void {
    if (selectedGenreIds.value.length === 0)
      return
    selectedGenreIds.value = []
    void refresh()
  }

  return {
    ...paged,
    kind,
    selectedGenreIds,
    genres,
    refresh,
    loadMore: loadNextPage,
    setKind,
    toggleGenre,
    clearGenres,
  }
}

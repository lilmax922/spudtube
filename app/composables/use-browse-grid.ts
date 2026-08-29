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
  fetchDiscover: (
    kind: Kind,
    options: { genreIds: number[], minRating: number | null, page: number, language?: TmdbLanguage },
  ) => Promise<Page<TitleSummary>>
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
    fetchDiscover(kind, { genreIds, minRating, page, language }) {
      return $fetch<Page<TitleSummary>>('/api/catalog/discover', {
        query: {
          kind: KIND_SEGMENT[kind],
          ...(genreIds.length > 0 ? { genres: genreIds.join(',') } : {}),
          ...(minRating != null ? { minRating: String(minRating) } : {}),
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
  minRating: Ref<number | null>
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
  setMinRating: (rating: number | null) => void
}

let browseGridInstance: BrowseGridState | undefined

export function useBrowseGrid(fetcher?: BrowseFetcher): BrowseGridState {
  const isDefault = fetcher === undefined
  if (isDefault && browseGridInstance)
    return browseGridInstance
  const actualFetcher = fetcher ?? createApiBrowseFetcher()
  const kind = ref<Kind>('MOVIE')
  const selectedGenreIds = ref<number[]>([])
  const minRating = ref<number | null>(null)
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
    actualFetcher.fetchDiscover(kind.value, {
      genreIds: selectedGenreIds.value,
      minRating: minRating.value,
      page,
      language: tmdbLanguage.value,
    }),
  )

  async function refresh(): Promise<void> {
    try {
      const [genreList, applied] = await Promise.all([
        actualFetcher.fetchGenres(kind.value, tmdbLanguage.value),
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

  function setMinRating(rating: number | null): void {
    if (rating === minRating.value)
      return
    minRating.value = rating
    void refresh()
  }

  const state: BrowseGridState = {
    ...paged,
    kind,
    selectedGenreIds,
    minRating,
    genres,
    refresh,
    loadMore: loadNextPage,
    setKind,
    toggleGenre,
    clearGenres,
    setMinRating,
  }
  if (isDefault)
    browseGridInstance = state
  return state
}

export function resetBrowseGridForTest(): void {
  browseGridInstance = undefined
}

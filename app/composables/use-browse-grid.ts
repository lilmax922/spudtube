import type { Genre, Kind, Page, TitleSummary } from '#server/tmdb/types'
import { computed, ref } from 'vue'
import { $fetch } from '#imports'

const KIND_SEGMENT: Record<Kind, 'movie' | 'tv'> = {
  MOVIE: 'movie',
  TV_SHOW: 'tv',
}

export interface BrowseFetcher {
  fetchGenres: (kind: Kind) => Promise<Genre[]>
  fetchDiscover: (kind: Kind, genreIds: number[], page: number) => Promise<Page<TitleSummary>>
}

export function createApiBrowseFetcher(): BrowseFetcher {
  return {
    fetchGenres(kind) {
      return $fetch<Genre[]>('/api/catalog/genres', { query: { kind: KIND_SEGMENT[kind] } })
    },
    fetchDiscover(kind, genreIds, page) {
      return $fetch<Page<TitleSummary>>('/api/catalog/discover', {
        query: {
          kind: KIND_SEGMENT[kind],
          ...(genreIds.length > 0 ? { genres: genreIds.join(',') } : {}),
          page,
        },
      })
    },
  }
}

export function useBrowseGrid(fetcher: BrowseFetcher = createApiBrowseFetcher()) {
  const kind = ref<Kind>('MOVIE')
  const selectedGenreIds = ref<number[]>([])
  const genres = ref<Genre[]>([])
  const items = ref<TitleSummary[]>([])
  const page = ref(0)
  const totalPages = ref(1)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref(false)
  let generation = 0

  const hasMore = computed(() => page.value < totalPages.value)

  async function refresh(): Promise<void> {
    const current = ++generation
    loading.value = true
    loadingMore.value = false
    error.value = false
    try {
      const [genreList, firstPage] = await Promise.all([
        fetcher.fetchGenres(kind.value),
        fetcher.fetchDiscover(kind.value, selectedGenreIds.value, 1),
      ])
      if (current !== generation)
        return
      genres.value = genreList
      items.value = firstPage.results
      page.value = firstPage.page
      totalPages.value = firstPage.totalPages
    }
    catch {
      if (current === generation)
        error.value = true
    }
    finally {
      if (current === generation)
        loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (loading.value || loadingMore.value || !hasMore.value)
      return
    const current = generation
    loadingMore.value = true
    error.value = false
    try {
      const next = await fetcher.fetchDiscover(kind.value, selectedGenreIds.value, page.value + 1)
      if (current !== generation)
        return
      items.value = [...items.value, ...next.results]
      page.value = next.page
      totalPages.value = next.totalPages
    }
    catch {
      if (current === generation)
        error.value = true
    }
    finally {
      loadingMore.value = false
    }
  }

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
    kind,
    selectedGenreIds,
    genres,
    items,
    page,
    totalPages,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore,
    setKind,
    toggleGenre,
    clearGenres,
  }
}

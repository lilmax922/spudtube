import type { ComputedRef, Ref } from 'vue'
import type { TitleSummary } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import type { BrowseFetcher, BrowseGridState } from './use-browse-grid'
import type { SectionsFetcher } from './use-browse-sections'
import type { KeywordSearchState, SearchFetcher } from './use-keyword-search'
import { computed, watch } from 'vue'
import { useBrowseGrid } from './use-browse-grid'
import { useBrowseSections } from './use-browse-sections'
import { useKeywordSearch } from './use-keyword-search'

export interface BrowseRow {
  key: string
  titleKey: string
  items: TitleSummary[]
  canSeeMore: boolean
}

export interface BrowseListingFetchers {
  browse?: BrowseFetcher
  search?: SearchFetcher
  sections?: SectionsFetcher
}

export interface BrowseListing {
  mode: ComputedRef<'browse' | 'search'>
  kind: Ref<Kind>
  rows: ComputedRef<BrowseRow[]>
  items: ComputedRef<TitleSummary[]>
  loading: ComputedRef<boolean>
  loadingMore: ComputedRef<boolean>
  error: ComputedRef<boolean>
  searchedQuery: Ref<string>
  selectedGenreIds: Ref<number[]>
  minRating: Ref<number | null>
  selectedProviderIds: Ref<number[]>
  availableProviders: ComputedRef<BrowseGridState['availableProviders']['value']>
  popularProviders: Ref<BrowseGridState['popularProviders']['value']>
  providerSearchResults: Ref<BrowseGridState['providerSearchResults']['value']>
  providerSearchQuery: Ref<string>
  providerSearchLoading: Ref<boolean>
  genres: Ref<BrowseGridState['genres']['value']>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  applySection: (key: string) => Promise<void>
  setKind: (kind: Kind) => void
  toggleGenre: (genreId: number) => void
  clearGenres: () => void
  setMinRating: (rating: number | null) => void
  toggleProvider: (providerId: number) => void
  clearProviders: () => void
  clearFilters: () => void
  search: (query: string) => Promise<void>
  clearSearch: () => void
  searchProviders: (query: string) => void
  clearProviderSearch: () => void
}

let listingInstance: BrowseListing | undefined

// The BrowseListing behind one seam: filter state, the search session, the
// TitleCarouselSection rows, and paging all live inside. Callers see mode,
// rows, items, and one loadMore; the three fetchers stay injectable so tests
// cross the same seam with fakes. Rows carry titleKey, never translated
// labels: DisplayLocale stays a view concern.
export function useBrowseListing(fetchers?: BrowseListingFetchers): BrowseListing {
  if (fetchers === undefined && listingInstance)
    return listingInstance

  const grid = useBrowseGrid(fetchers?.browse)
  const searchSession: KeywordSearchState = useKeywordSearch(fetchers?.search)
  const sectionState = useBrowseSections(grid.kind, fetchers?.sections)

  const mode = computed<'browse' | 'search'>(() => searchSession.mode.value)

  const rows = computed<BrowseRow[]>(() =>
    sectionState.sections.value.map(section => ({
      key: section.key,
      titleKey: section.titleKey,
      items: section.titles,
      canSeeMore: section.genres.length > 0,
    })),
  )

  const items = computed<TitleSummary[]>(() =>
    mode.value === 'search' ? searchSession.items.value : grid.items.value,
  )
  const loading = computed<boolean>(() =>
    mode.value === 'search' ? searchSession.loading.value : grid.loading.value,
  )
  const loadingMore = computed<boolean>(() =>
    mode.value === 'search' ? searchSession.loadingMore.value : grid.loadingMore.value,
  )
  const error = computed<boolean>(() =>
    mode.value === 'search' ? searchSession.error.value : grid.error.value,
  )

  // A fresh search always starts from unfiltered browse state.
  watch(() => searchSession.searchedQuery.value, (value) => {
    if (value !== '')
      grid.clearFilters()
  })

  async function refresh(): Promise<void> {
    await Promise.all([grid.refresh(), sectionState.refresh()])
  }

  async function loadMore(): Promise<void> {
    if (mode.value === 'search')
      await searchSession.loadMore()
    else
      await grid.loadMore()
  }

  // Replaying a row is one filter application and one refresh: assigning the
  // refs directly instead of looping the toggle setters keeps the N+1 refetch
  // storm behind the seam for good.
  async function applySection(key: string): Promise<void> {
    const section = sectionState.sections.value.find(entry => entry.key === key)
    if (!section || section.genres.length === 0)
      return
    grid.selectedGenreIds.value = [...section.query.genreIds ?? []]
    grid.minRating.value = section.query.minRating ?? null
    grid.selectedProviderIds.value = []
    await grid.refresh()
  }

  async function search(query: string): Promise<void> {
    await searchSession.search(query)
  }

  function clearSearch(): void {
    searchSession.clear()
  }

  const listing: BrowseListing = {
    mode,
    kind: grid.kind,
    rows,
    items,
    loading,
    loadingMore,
    error,
    searchedQuery: searchSession.searchedQuery,
    selectedGenreIds: grid.selectedGenreIds,
    minRating: grid.minRating,
    selectedProviderIds: grid.selectedProviderIds,
    availableProviders: grid.availableProviders,
    popularProviders: grid.popularProviders,
    providerSearchResults: grid.providerSearchResults,
    providerSearchQuery: grid.providerSearchQuery,
    providerSearchLoading: grid.providerSearchLoading,
    genres: grid.genres,
    refresh,
    loadMore,
    applySection,
    setKind: grid.setKind,
    toggleGenre: grid.toggleGenre,
    clearGenres: grid.clearGenres,
    setMinRating: grid.setMinRating,
    toggleProvider: grid.toggleProvider,
    clearProviders: grid.clearProviders,
    clearFilters: grid.clearFilters,
    search,
    clearSearch,
    searchProviders: grid.searchProviders,
    clearProviderSearch: grid.clearProviderSearch,
  }
  // Last writer wins: tests seed the shared instance with fakes before
  // mounting, and every consumer sees the same session. Reset per test.
  listingInstance = listing
  return listing
}

export function resetBrowseListingForTest(): void {
  listingInstance = undefined
}

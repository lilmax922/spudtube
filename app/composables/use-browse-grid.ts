import type { ComputedRef, Ref } from 'vue'
import type { Genre, Page, Provider, TitleSummary, TmdbLanguage } from '#server/tmdb/types'
import type { Kind } from '#shared/kind/kind'
import { computed, ref, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '#shared/kind/kind'
import { DEFAULT_REGION } from '#shared/region/region'
import { usePagedResults } from './use-paged-results'
import { useRegion } from './use-region'
import { useTmdbLanguage } from './use-tmdb-language'

export interface FetchProviderListOptions {
  q?: string
  popular?: boolean
}

export interface BrowseFetcher {
  fetchGenres: (kind: Kind, language?: TmdbLanguage) => Promise<Genre[]>
  fetchDiscover: (
    kind: Kind,
    options: { genreIds: number[], minRating: number | null, providerIds: number[], page: number, language?: TmdbLanguage },
  ) => Promise<Page<TitleSummary>>
  fetchProviders: (kind: Kind, tmdbIds: number[], language?: TmdbLanguage) => Promise<Map<string, Provider[]>>
  fetchProviderList: (kind: Kind, language?: TmdbLanguage, options?: FetchProviderListOptions) => Promise<Provider[]>
}

export function createApiBrowseFetcher(): BrowseFetcher {
  return {
    fetchGenres(kind, language) {
      return $fetch<Genre[]>('/api/catalog/genres', {
        query: {
          kind: toMediaSegment(kind),
          ...(language ? { language } : {}),
        },
      })
    },
    fetchDiscover(kind, { genreIds, minRating, providerIds, page, language }) {
      return $fetch<Page<TitleSummary>>('/api/catalog/discover', {
        query: {
          kind: toMediaSegment(kind),
          ...(genreIds.length > 0 ? { genres: genreIds.join(',') } : {}),
          ...(minRating != null ? { minRating: String(minRating) } : {}),
          ...(providerIds.length > 0 ? { providers: providerIds.join(',') } : {}),
          page,
          ...(language ? { language } : {}),
        },
      })
    },
    fetchProviders(kind, tmdbIds, language) {
      if (tmdbIds.length === 0)
        return Promise.resolve(new Map())
      return $fetch<Record<string, Provider[]>>('/api/catalog/providers', {
        query: {
          kind: toMediaSegment(kind),
          ids: tmdbIds.join(','),
          ...(language ? { language } : {}),
        },
      }).then((record: Record<string, Provider[]>) => new Map(Object.entries(record)))
    },
    fetchProviderList(kind, language, options) {
      return $fetch<Provider[]>('/api/catalog/provider-list', {
        query: {
          kind: toMediaSegment(kind),
          ...(language ? { language } : {}),
          ...(options?.q ? { q: options.q } : {}),
          ...(options?.popular ? { popular: '1' } : {}),
        },
      })
    },
  }
}

export interface BrowseGridState {
  kind: Ref<Kind>
  selectedGenreIds: Ref<number[]>
  minRating: Ref<number | null>
  selectedProviderIds: Ref<number[]>
  availableProviders: ComputedRef<Provider[]>
  popularProviders: Ref<Provider[]>
  providerSearchResults: Ref<Provider[]>
  providerSearchQuery: Ref<string>
  providerSearchLoading: Ref<boolean>
  genres: Ref<Genre[]>
  filterMetadataLoading: Ref<boolean>
  items: Ref<TitleSummary[]>
  page: Ref<number>
  totalPages: Ref<number>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  error: Ref<boolean>
  hasMore: ComputedRef<boolean>
  ensureFilterData: () => Promise<void>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setKind: (kind: Kind) => void
  toggleGenre: (genreId: number) => void
  clearGenres: () => void
  setMinRating: (rating: number | null) => void
  toggleProvider: (providerId: number) => void
  clearProviders: () => void
  clearFilters: () => void
  searchProviders: (query: string) => void
  clearProviderSearch: () => void
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
  const selectedProviderIds = ref<number[]>([])
  const providerListRaw = ref<Provider[]>([])
  const popularProviders = ref<Provider[]>([])
  const providerSearchResults = ref<Provider[]>([])
  const providerSearchQuery = ref('')
  const providerSearchLoading = ref(false)
  const genres = ref<Genre[]>([])
  const filterMetadataLoading = ref(true)
  const tmdbLanguage = useTmdbLanguage()

  let regionRef: Ref<string>
  try {
    regionRef = (useRegion().region as unknown) as Ref<string>
  }
  catch {
    regionRef = ref(DEFAULT_REGION) as Ref<string>
  }

  const availableProviders = computed<Provider[]>(() => {
    return [...providerListRaw.value].sort((a, b) => a.name.localeCompare(b.name))
  })

  const { loadFirstPage, loadNextPage, ...paged } = usePagedResults<TitleSummary>(page =>
    actualFetcher.fetchDiscover(kind.value, {
      genreIds: selectedGenreIds.value,
      minRating: minRating.value,
      providerIds: selectedProviderIds.value,
      page,
      language: tmdbLanguage.value,
    }),
  )

  function hasActiveFilters(): boolean {
    return selectedGenreIds.value.length > 0
      || minRating.value != null
      || selectedProviderIds.value.length > 0
  }

  // Filter metadata (genres + popular providers) prefetches on mount so the
  // filter options render immediately. The unfiltered home shows Hero +
  // server-driven rows and never needs discover.
  let filterDataKey: string | undefined
  let filterDataGeneration = 0
  let filterDataInflight: { key: string, generation: number, promise: Promise<void> } | undefined

  async function ensureFilterData(): Promise<void> {
    const key = `${kind.value}:${tmdbLanguage.value}`
    if (filterDataKey === key)
      return
    const seen = filterDataGeneration
    const inflight = filterDataInflight
    if (inflight && inflight.key === key && inflight.generation === seen) {
      await inflight.promise
      return
    }
    const startKind = kind.value
    const startLanguage = tmdbLanguage.value
    filterMetadataLoading.value = true
    const promise = (async (): Promise<void> => {
      // Popular-only by default: small curated set instead of 805 providers.
      // Both legs tolerate upstream failure with empty lists so a metadata
      // outage never blocks the discover query that actually decides the grid.
      const fetchPopular = actualFetcher.fetchProviderList
        ? actualFetcher.fetchProviderList(kind.value, tmdbLanguage.value, { popular: true }).catch(() => [] as Provider[])
        : Promise.resolve([] as Provider[])
      const fetchGenreList = actualFetcher.fetchGenres(kind.value, tmdbLanguage.value).catch(() => [] as Genre[])
      const [genreList, popularList] = await Promise.all([
        fetchGenreList,
        fetchPopular,
      ])
      // A kind/language/region switch mid-flight invalidates the payload: drop
      // it so the retry fetches for the current context instead.
      if (filterDataGeneration !== seen)
        return
      if (kind.value !== startKind || tmdbLanguage.value !== startLanguage)
        return
      genres.value = genreList
      popularProviders.value = popularList
      providerListRaw.value = popularList
      filterDataKey = key
    })()
    filterDataInflight = { key, generation: seen, promise }
    try {
      await promise
    }
    finally {
      if (filterDataInflight?.promise === promise)
        filterDataInflight = undefined
      if (filterDataGeneration === seen && kind.value === startKind && tmdbLanguage.value === startLanguage)
        filterMetadataLoading.value = false
    }
  }

  function invalidateFilterData(): void {
    filterDataGeneration++
    filterDataKey = undefined
    genres.value = []
    popularProviders.value = []
    providerListRaw.value = []
    filterMetadataLoading.value = true
  }

  async function refresh(): Promise<void> {
    // Unfiltered browse renders the cached section rows; filter metadata
    // prefetches on mount while discover only fires once the visitor
    // actually picks a filter.
    if (!hasActiveFilters()) {
      paged.reset()
      await ensureFilterData().catch(() => {})
      return
    }
    try {
      await ensureFilterData()
      await loadFirstPage()
    }
    catch {
      paged.markFailed(paged.attempt())
    }
  }

  let providerSearchToken = 0
  let providerSearchTimer: ReturnType<typeof setTimeout> | undefined

  function searchProviders(query: string): void {
    const trimmed = query.trim()
    providerSearchQuery.value = trimmed
    if (providerSearchTimer)
      clearTimeout(providerSearchTimer)
    if (trimmed.length === 0) {
      providerSearchResults.value = []
      providerSearchLoading.value = false
      return
    }
    providerSearchLoading.value = true
    const token = ++providerSearchToken
    providerSearchTimer = setTimeout(async () => {
      try {
        const fetched = actualFetcher.fetchProviderList
          ? await actualFetcher.fetchProviderList(kind.value, tmdbLanguage.value, { q: trimmed }).catch(() => [] as Provider[])
          : [] as Provider[]
        if (token !== providerSearchToken)
          return
        providerSearchResults.value = fetched
      }
      finally {
        if (token === providerSearchToken)
          providerSearchLoading.value = false
      }
    }, 180)
  }

  function clearProviderSearch(): void {
    if (providerSearchTimer)
      clearTimeout(providerSearchTimer)
    ++providerSearchToken
    providerSearchQuery.value = ''
    providerSearchResults.value = []
    providerSearchLoading.value = false
  }

  watch([tmdbLanguage, regionRef], () => {
    clearProviderSearch()
    invalidateFilterData()
    void refresh()
  })

  function setKind(next: Kind): void {
    if (next === kind.value)
      return
    kind.value = next
    selectedGenreIds.value = []
    selectedProviderIds.value = []
    clearProviderSearch()
    invalidateFilterData()
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

  function toggleProvider(providerId: number): void {
    selectedProviderIds.value = selectedProviderIds.value.includes(providerId)
      ? selectedProviderIds.value.filter(id => id !== providerId)
      : [...selectedProviderIds.value, providerId]
    void refresh()
  }

  function clearProviders(): void {
    if (selectedProviderIds.value.length === 0)
      return
    selectedProviderIds.value = []
    void refresh()
  }

  function clearFilters(): void {
    const hadGenre = selectedGenreIds.value.length > 0
    selectedGenreIds.value = []
    const hadRating = minRating.value != null
    minRating.value = null
    const hadProvider = selectedProviderIds.value.length > 0
    selectedProviderIds.value = []
    if (hadGenre || hadRating || hadProvider)
      void refresh()
  }

  const state: BrowseGridState = {
    ...paged,
    kind,
    selectedGenreIds,
    minRating,
    selectedProviderIds,
    availableProviders,
    popularProviders,
    providerSearchResults,
    providerSearchQuery,
    providerSearchLoading,
    genres,
    filterMetadataLoading,
    ensureFilterData,
    refresh,
    loadMore: async () => {
      if (!hasActiveFilters())
        return
      await loadNextPage()
    },
    setKind,
    toggleGenre,
    clearGenres,
    setMinRating,
    toggleProvider,
    clearProviders,
    clearFilters,
    searchProviders,
    clearProviderSearch,
  }
  if (isDefault)
    browseGridInstance = state
  return state
}

export function resetBrowseGridForTest(): void {
  browseGridInstance = undefined
}

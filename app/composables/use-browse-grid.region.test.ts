import type { Page, TitleSummary } from '#server/tmdb/types'
import type { BrowseFetcher } from './use-browse-grid'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// Mock useRegion to provide controllable region ref
const regionRef = ref('TW')

vi.mock('./use-region', async () => {
  const actual = await vi.importActual<typeof import('./use-region')>('./use-region')
  const regionModule = await import('#shared/region/region')
  return {
    ...actual,
    useRegion: () => ({
      region: regionRef,
      curatedRegions: regionModule.CURATED_REGIONS,
      setRegion: vi.fn(),
    }),
  }
})

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      locale: ref('en'),
      t: (key: string) => key,
      setLocale: vi.fn(),
    }),
  }
})

const { useBrowseGrid, resetBrowseGridForTest } = await import('./use-browse-grid')

function createFakeFetcher() {
  const fetchGenres = vi.fn<BrowseFetcher['fetchGenres']>().mockResolvedValue([])
  const fetchDiscover = vi.fn<BrowseFetcher['fetchDiscover']>().mockResolvedValue({ page: 1, results: [], totalPages: 1, totalResults: 0 })
  const fetchProviders = vi.fn<BrowseFetcher['fetchProviders']>().mockResolvedValue(new Map())
  const fetchProviderList = vi.fn<BrowseFetcher['fetchProviderList']>().mockResolvedValue([])
  return { fetcher: { fetchGenres, fetchDiscover, fetchProviders, fetchProviderList } as unknown as BrowseFetcher, fetchGenres, fetchDiscover, fetchProviders, fetchProviderList }
}

function page(results: TitleSummary[]): Page<TitleSummary> {
  return { page: 1, results, totalPages: 1, totalResults: results.length }
}

describe('use-browse-grid — region watch (geolocation)', () => {
  it('refetches provider list when region changes (geolocation)', async () => {
    resetBrowseGridForTest()
    regionRef.value = 'TW'
    const { fetcher, fetchProviderList, fetchGenres, fetchDiscover } = createFakeFetcher()
    fetchGenres.mockResolvedValue([])
    fetchDiscover.mockResolvedValue(page([]))

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    const initialCalls = fetchProviderList.mock.calls.length
    expect(initialCalls).toBeGreaterThanOrEqual(1)
    expect(fetchProviderList).toHaveBeenCalledWith('MOVIE', expect.any(String), expect.objectContaining({ popular: true }))

    fetchProviderList.mockClear()
    fetchGenres.mockClear()
    fetchDiscover.mockClear()
    // Simulate geolocation change to US (e.g., cf-ipcountry changes or cookie set)
    regionRef.value = 'US'

    await vi.waitFor(() => expect(fetchProviderList).toHaveBeenCalled())
    // refresh should have been triggered automatically via watch
    expect(fetchProviderList).toHaveBeenCalledWith('MOVIE', expect.any(String), expect.objectContaining({ popular: true }))
  })

  it('clears provider search on region change', async () => {
    resetBrowseGridForTest()
    regionRef.value = 'TW'
    const { fetcher, fetchProviderList } = createFakeFetcher()
    fetchProviderList.mockResolvedValue([{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }])

    const grid = useBrowseGrid(fetcher)
    await grid.refresh()
    grid.searchProviders('net')
    // wait for debounce
    await new Promise(r => setTimeout(r, 250))
    await vi.waitFor(() => expect(grid.providerSearchQuery.value).toBe('net'))

    regionRef.value = 'JP'
    await vi.waitFor(() => expect(grid.providerSearchQuery.value).toBe(''))
    expect(grid.providerSearchResults.value).toEqual([])
  })
})

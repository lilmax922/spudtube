import type { MaybeRefOrGetter } from 'vue'
import type { ProviderCatalog, TitleSummary } from '#server/tmdb/types'
import type { TitleCardFeed } from './use-title-card-data'
import { ref, toValue, watch } from 'vue'
import { $fetch } from '#imports'
import { toMediaSegment } from '#shared/kind/kind'
import { useDiscoveryBadges } from './use-discovery-badges'
import { useRegion } from './use-region'
import { useTmdbLanguage } from './use-tmdb-language'

export interface RowCardData {
  feedFor: (item: TitleSummary) => TitleCardFeed
}

// Single owner for every card data read inside one TitleCarouselSection: the
// badge sets load once per row, the Region is read once, and each title's
// provider catalog loads at most once, on first inspection. Cards stay pure
// render: they receive a feed and report inspections back through it.
export function useRowCardData(items: MaybeRefOrGetter<TitleSummary[]>): RowCardData {
  // Rows render one query result, so every item shares a Kind for the row's
  // lifetime. Empty rows fetch a throwaway badge payload no card ever reads.
  const rowKind = toValue(items)[0]?.kind ?? 'MOVIE'
  const { badges } = useDiscoveryBadges(rowKind)
  const { region } = useRegion()

  const tmdbLanguage = useTmdbLanguage()

  const catalogs = ref(new Map<string, ProviderCatalog>())
  const inflight = new Map<string, Promise<void>>()

  // Same locale reactivity as useAvailability: a DisplayLocale switch drops
  // cached catalogs so provider names reload in the new locale on next
  // inspection instead of lingering in the old one.
  watch(tmdbLanguage, () => {
    catalogs.value.clear()
  })

  function catalogKey(item: TitleSummary): string {
    return `${item.kind}:${item.tmdbId}:${tmdbLanguage.value}`
  }

  function loadCatalogFor(item: TitleSummary): Promise<void> {
    const key = catalogKey(item)
    if (catalogs.value.has(key))
      return Promise.resolve()
    const running = inflight.get(key)
    if (running != null)
      return running
    // Same endpoint contract as useAvailability; hover-only enrichment stays
    // silent on failure and the strip simply never appears.
    const task = $fetch<ProviderCatalog>(
      `/api/catalog/${toMediaSegment(item.kind)}/${item.tmdbId}/providers`,
      { query: { language: tmdbLanguage.value } },
    ).then(
      (catalog: ProviderCatalog) => {
        catalogs.value.set(key, catalog)
        inflight.delete(key)
      },
      () => {
        inflight.delete(key)
      },
    )
    inflight.set(key, task)
    return task
  }

  function feedFor(item: TitleSummary): TitleCardFeed {
    return {
      badges: badges.data.value,
      catalog: catalogs.value.get(catalogKey(item)),
      region: region.value,
      loadCatalog: () => loadCatalogFor(item),
    }
  }

  return { feedFor }
}

import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { DiscoveryBadges, ProviderCatalog, TitleSummary } from '#server/tmdb/types'
import { computed, ref, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  formatRatingText,
  resolveDiscoveryBadge,
  resolveHoverProviders,
  resolveReleaseYear,
} from '../lib/card-display'
import { posterSrcSet, posterUrl, providerLogoSrcSet, providerLogoUrl } from '../lib/images'
import { kindLabelKey } from '../lib/kind'
import { useAvailability } from './use-availability'
import { useDiscoveryBadges } from './use-discovery-badges'
import { useRegion } from './use-region'

// Row-owned card data. The section builds one feed per displayed title and
// passes it down; cards outside a section mount without a feed and load their
// own data exactly as before.
export interface TitleCardFeed {
  badges: DiscoveryBadges | null | undefined
  catalog: ProviderCatalog | null | undefined
  region: string
  loadCatalog: () => Promise<void>
}

export interface ProviderLogo {
  id: number
  name: string
  src: string | undefined
  srcset: string | undefined
}

export interface TitleCardArtwork {
  src: string
  srcset: string | null
}

export interface TitleCardData {
  kindLabel: ComputedRef<string>
  discoveryBadge: ComputedRef<string>
  ratingText: ComputedRef<string>
  year: ComputedRef<string | null>
  poster: ComputedRef<TitleCardArtwork | null>
  providerLogos: ComputedRef<ProviderLogo[]>
  markInspected: () => void
}

// Shared presentation core behind both card adapters (rest and expanded).
// Every badge, rating, year, artwork and provider derivation lives here, so
// the two cards keep only their own interaction and template differences.
export function useTitleCardData(
  title: MaybeRefOrGetter<TitleSummary>,
  feed: MaybeRefOrGetter<TitleCardFeed | undefined>,
): TitleCardData {
  const { t } = useI18n()

  // Feed presence is fixed per mount site: the section always feeds its cards,
  // every other caller never does. The setup-time branch below therefore keeps
  // a stable hook order for each card instance.
  const self = toValue(feed) == null
    ? {
        badges: useDiscoveryBadges(toValue(title).kind),
        availability: useAvailability(toValue(title).kind, toValue(title).tmdbId, { immediate: false }),
        region: useRegion(),
      }
    : null

  const badgesData = computed(() => toValue(feed)?.badges ?? self?.badges.badges.data.value)
  const catalogData = computed(() => toValue(feed)?.catalog ?? self?.availability.catalog.data.value)
  const regionValue = computed(() => toValue(feed)?.region ?? self?.region.region.value ?? '')

  const kindLabel = computed(() => t(kindLabelKey(toValue(title).kind)))

  const discoveryBadge = computed(() => {
    const key = resolveDiscoveryBadge(badgesData.value, toValue(title).tmdbId)
    return key == null ? '' : t(key)
  })

  const ratingText = computed(() => formatRatingText(toValue(title).voteAverage))
  const year = computed(() => resolveReleaseYear(toValue(title).releaseDate))

  const poster = computed((): TitleCardArtwork | null => {
    const path = toValue(title).posterPath
    if (path == null)
      return null
    const src = posterUrl(path)
    if (src == null)
      return null
    return { src, srcset: posterSrcSet(path) }
  })

  const providerLogos = computed((): ProviderLogo[] =>
    resolveHoverProviders(catalogData.value, regionValue.value).map(provider => ({
      id: provider.id,
      name: provider.name,
      src: providerLogoUrl(provider.logoPath) ?? undefined,
      srcset: providerLogoSrcSet(provider.logoPath) ?? undefined,
    })),
  )

  const inspected = ref(false)

  function markInspected(): void {
    if (inspected.value)
      return
    inspected.value = true
    const load = toValue(feed)?.loadCatalog ?? self?.availability.loadCatalog
    void load?.()
  }

  return { kindLabel, discoveryBadge, ratingText, year, poster, providerLogos, markInspected }
}

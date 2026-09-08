import type { DiscoveryBadges, Provider, ProviderCatalog } from '#server/tmdb/types'

// Single spelling for the hover provider strip: subscription first, then free,
// logo-less entries dropped, capped so the overlay never overflows.
export const HOVER_PROVIDER_LIMIT = 6

export type DiscoveryBadgeKey = 'card.badges.trending' | 'card.badges.topRated'

// Labels only ever come from real TMDB list membership (/trending/{kind}/week,
// /{kind}/top_rated); there is deliberately no vote-threshold fallback because
// that would fabricate status.
export function resolveDiscoveryBadge(
  badges: DiscoveryBadges | null | undefined,
  tmdbId: number,
): DiscoveryBadgeKey | null {
  if (badges == null)
    return null
  if (badges.trendingIds.includes(tmdbId))
    return 'card.badges.trending'
  if (badges.topRatedIds.includes(tmdbId))
    return 'card.badges.topRated'
  return null
}

export function resolveHoverProviders(
  catalog: ProviderCatalog | null | undefined,
  region: string,
  limit: number = HOVER_PROVIDER_LIMIT,
): Provider[] {
  const entry = catalog?.[region]
  if (entry == null)
    return []
  const streamable = [...entry.groups.subscription, ...entry.groups.free]
    .filter(provider => provider.logoPath != null)
  return streamable.slice(0, limit)
}

export function formatRatingText(voteAverage: number | null): string {
  return voteAverage != null ? voteAverage.toFixed(1) : '—'
}

export function resolveReleaseYear(releaseDate: string | null): string | null {
  return releaseDate?.slice(0, 4) ?? null
}

export function resolveHoverDescription(overview: string | null | undefined): string | null {
  return overview != null && overview.trim().length > 0 ? overview : null
}

/**
 * Region selection: a curated fixed list of Regions the Availability panel offers.
 * The selected Region only changes which Providers are shown — it never filters
 * catalog content (CONTEXT.md: Region).
 */
export const CURATED_REGIONS = [
  'TW',
  'HK',
  'JP',
  'KR',
  'SG',
  'US',
  'GB',
  'CA',
  'AU',
  'DE',
  'FR',
  'IN',
  'BR',
  'MX',
] as const

export type Region = (typeof CURATED_REGIONS)[number]

/**
 * Fallback when no country signal arrives or the detected country is not
 * curated. The spec leaves this case open (the switcher only ever offers
 * curated Regions); TW is the product's primary market, matching the
 * prototype's default.
 */
export const DEFAULT_REGION: Region = 'TW'

export const REGION_COOKIE = 'spudtube-region'

export function isCuratedRegion(value: unknown): value is Region {
  return (
    typeof value === 'string' && (CURATED_REGIONS as readonly string[]).includes(value)
  )
}

/** Maps a country code to a curated Region, or null when it is not offered. */
export function countryToRegion(country: string | null | undefined): Region | null {
  const normalized = country?.trim().toUpperCase() ?? ''
  return isCuratedRegion(normalized) ? normalized : null
}

/**
 * The selected Region: a persisted browser-side choice wins; otherwise the
 * DetectedRegion from the platform country header; otherwise the default.
 */
export function resolveSelectedRegion(
  cookieRegion: string | null | undefined,
  detectedCountry: string | null | undefined,
): Region {
  if (isCuratedRegion(cookieRegion))
    return cookieRegion
  return countryToRegion(detectedCountry) ?? DEFAULT_REGION
}

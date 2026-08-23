import type { ComputedRef } from 'vue'
import type { Region } from '#shared/region/region'
import { computed } from 'vue'
import { useCookie, useState } from '#imports'
import { DETECTED_COUNTRY_KEY } from '#shared/i18n/locale'
import {
  CURATED_REGIONS,
  isCuratedRegion,

  REGION_COOKIE,
  resolveSelectedRegion,
} from '#shared/region/region'

const REGION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export interface RegionController {
  /** The Region Availability currently displays; never filters catalog content. */
  region: ComputedRef<Region>
  curatedRegions: readonly Region[]
  /** Persists the choice in this browser only; DetectedRegion remains untouched. */
  setRegion: (next: Region) => void
}

export function useRegion(): RegionController {
  const regionCookie = useCookie<string | null>(REGION_COOKIE, {
    maxAge: REGION_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
  })
  const detectedCountry = useState<string | null>(DETECTED_COUNTRY_KEY, () => null)
  const region = computed<Region>(() =>
    resolveSelectedRegion(regionCookie.value, detectedCountry.value),
  )

  function setRegion(next: Region): void {
    if (!isCuratedRegion(next) || next === region.value) {
      return
    }
    regionCookie.value = next
  }

  return { region, curatedRegions: CURATED_REGIONS, setRegion }
}

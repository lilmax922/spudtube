export const LOCALES = ['zh-TW', 'en'] as const

export type AppLocale = (typeof LOCALES)[number]

/** Locale used for missing translations and visitors with no country signal. */
export const FALLBACK_LOCALE: AppLocale = 'en'

/**
 * Platform-injected country signal, shared with the Region feature (ticket 07):
 * Cloudflare Pages/Workers exposes it as `cf-ipcountry`.
 */
export const COUNTRY_HEADER = 'cf-ipcountry'

export const LOCALE_COOKIE = 'spudtube-locale'

/** useState key carrying the request's detected country from server into the client payload. */
export const DETECTED_COUNTRY_KEY = 'detected-country'

export type CountryHeaderValue = string | string[] | undefined

/** Extracts the country code from the platform-injected header object. */
export function readDetectedCountry(
  headers: Record<string, CountryHeaderValue | null>,
): string | null {
  const value = headers[COUNTRY_HEADER]
  return Array.isArray(value) ? (value[0] ?? null) : value ?? null
}

const COUNTRY_TO_LOCALE: Record<string, AppLocale> = {
  TW: 'zh-TW',
}

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function countryToLocale(country: string | null | undefined): AppLocale {
  const normalized = country?.trim().toUpperCase() ?? ''
  return COUNTRY_TO_LOCALE[normalized] ?? FALLBACK_LOCALE
}

export function resolveDisplayLocale(
  cookieLocale: string | null | undefined,
  country: string | null | undefined,
): AppLocale {
  if (isAppLocale(cookieLocale))
    return cookieLocale
  return countryToLocale(country)
}

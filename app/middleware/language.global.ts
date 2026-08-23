import { defineNuxtRouteMiddleware, useCookie, useNuxtApp, useRequestHeaders, useState } from '#imports'
import {
  COUNTRY_HEADER,
  DETECTED_COUNTRY_KEY,
  LOCALE_COOKIE,
  readDetectedCountry,
  resolveDisplayLocale,
} from '#shared/i18n/locale'

function readCountryFromRequest(): string | null {
  if (!import.meta.server) {
    return null
  }
  const headers = useRequestHeaders([COUNTRY_HEADER])
  return readDetectedCountry(headers)
}

export default defineNuxtRouteMiddleware(() => {
  const country = useState<string | null>(DETECTED_COUNTRY_KEY, readCountryFromRequest)
  const persisted = useCookie<string | null>(LOCALE_COOKIE)
  const target = resolveDisplayLocale(persisted.value, country.value)
  const { $i18n } = useNuxtApp()
  if ($i18n.locale.value !== target) {
    return $i18n.setLocale(target)
  }
})

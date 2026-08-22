import { defineNuxtRouteMiddleware, useCookie, useNuxtApp, useRequestHeaders, useState } from '#imports'
import { COUNTRY_HEADER, DETECTED_COUNTRY_KEY, LOCALE_COOKIE, resolveDisplayLocale } from '#shared/i18n/locale'

function readDetectedCountry(): string | null {
  if (!import.meta.server) {
    return null
  }
  const headers = useRequestHeaders([COUNTRY_HEADER])
  const value = headers[COUNTRY_HEADER]
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export default defineNuxtRouteMiddleware(() => {
  const country = useState<string | null>(DETECTED_COUNTRY_KEY, readDetectedCountry)
  const persisted = useCookie<string | null>(LOCALE_COOKIE)
  const target = resolveDisplayLocale(persisted.value, country.value)
  const { $i18n } = useNuxtApp()
  if ($i18n.locale.value !== target) {
    return $i18n.setLocale(target)
  }
})

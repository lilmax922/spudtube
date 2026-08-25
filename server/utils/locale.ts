import type { H3Event } from 'h3'
import type { TmdbLanguage } from '../tmdb/types'
import { getCookie, getHeader } from 'h3'
import {
  COUNTRY_HEADER,
  LOCALE_COOKIE,
  resolveDisplayLocale,
} from '../../shared/i18n/locale'

export function getRequestLocale(event: H3Event): TmdbLanguage {
  const cookieLocale = getCookie(event, LOCALE_COOKIE)
  const country = getHeader(event, COUNTRY_HEADER) ?? getHeader(event, 'cf-ipcountry')
  return resolveDisplayLocale(cookieLocale, country ?? undefined)
}

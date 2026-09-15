import type { H3Event } from 'h3'
import { createError, getCookie, getHeader, getQuery } from 'h3'
import { defineCachedEventHandler } from 'nitropack/runtime'
import { z } from 'zod'
import { COUNTRY_HEADER } from '../../../shared/i18n/locale'
import { DEFAULT_REGION, REGION_COOKIE, resolveSelectedRegion } from '../../../shared/region/region'
import { getTmdbClient, TmdbApiError } from '../../tmdb/client'
import { kindFromSegment } from '../../tmdb/mappers'
import { getRequestLocale } from '../../utils/locale'
import { genreIdsParam, languageParam, mediaSegmentParam, pageParam, providerIdsParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const discoverQuerySchema = z.object({
  kind: mediaSegmentParam,
  genres: genreIdsParam.optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  providers: providerIdsParam.optional(),
  page: pageParam,
  language: languageParam,
})

function resolveRegion(event: H3Event): string {
  const cookieRegion = getCookie(event, REGION_COOKIE)
  const detectedCountry = getHeader(event, COUNTRY_HEADER) ?? getHeader(event, 'cf-ipcountry')
  try {
    return resolveSelectedRegion(cookieRegion, detectedCountry ?? undefined)
  }
  catch {
    return DEFAULT_REGION
  }
}

export default defineCachedEventHandler(async (event) => {
  const { kind, genres, minRating, providers, page, language } = parseOrThrow(discoverQuerySchema, getQuery(event))
  const locale = language ?? getRequestLocale(event)
  const watchRegion = providers && providers.length > 0 ? resolveRegion(event) : undefined
  try {
    return await getTmdbClient().discover(kindFromSegment(kind), { genreIds: genres, minRating, providerIds: providers, watchRegion, page, language: locale })
  }
  catch (error) {
    // TMDB's own server sometimes 5xxes on valid watch-provider filters (e.g. Netflix+Amazon in TW).
    // Surface that as a clean 502 instead of leaking the raw upstream error as an unhandled 500.
    if (error instanceof TmdbApiError && error.status >= 500) {
      throw createError({
        statusCode: 502,
        statusMessage: 'TMDB upstream error',
      })
    }
    throw error
  }
}, {
  maxAge: 21600,
  // Source fix for the PR70 skeleton-forever outage: swr serves the stale
  // entry instantly while the expired slot revalidates in the background, so
  // a stalled TMDB upstream no longer blocks filtered browse on a live fetch.
  // Thrown 5xx/timeouts never populate the cache, so the stale entry
  // survives a failed revalidation and heals on the next success.
  // staleMaxAge bounds the downstream stale-while-revalidate window to a day.
  swr: true,
  staleMaxAge: 86400,
  // varies keeps the region inputs visible to the handler: Nitro strips every
  // non-varies header before the handler runs, which would blind resolveRegion
  // while getKey (built on the original event) still keyed by region.
  varies: ['cookie', 'cf-ipcountry'],
  getKey: (event) => {
    const query = getQuery(event)
    const first = (value: unknown): string | undefined => Array.isArray(value) ? value[0] as string : value as string | undefined
    const language = first(query.language) ?? getRequestLocale(event)
    return `discover:${first(query.kind) ?? ''}:${first(query.genres) ?? ''}:${first(query.minRating) ?? ''}:${first(query.providers) ?? ''}:${first(query.page) ?? '1'}:${language}:${resolveRegion(event)}`
  },
})

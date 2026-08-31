import { createError, defineEventHandler, getCookie, getHeader, getQuery } from 'h3'
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

function resolveRegion(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]): string {
  const cookieRegion = getCookie(event, REGION_COOKIE)
  const detectedCountry = getHeader(event, COUNTRY_HEADER) ?? getHeader(event, 'cf-ipcountry')
  try {
    return resolveSelectedRegion(cookieRegion, detectedCountry ?? undefined)
  }
  catch {
    return DEFAULT_REGION
  }
}

export default defineEventHandler(async (event) => {
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
})

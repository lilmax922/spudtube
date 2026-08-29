import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../../tmdb/client'
import { kindFromSegment } from '../../../tmdb/mappers'
import { getRequestLocale } from '../../../utils/locale'
import { languageParam, mediaSegmentParam, pageParam } from '../../../utils/params'
import { parseOrThrow } from '../../../utils/validation'

const trendingQuerySchema = z.object({
  kind: mediaSegmentParam,
  page: pageParam,
  language: languageParam,
})

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { kind, page, language } = parseOrThrow(trendingQuerySchema, {
    kind: getRouterParam(event, 'kind'),
    page: Array.isArray(query.page) ? query.page[0] : query.page,
    language: Array.isArray(query.language) ? query.language[0] : query.language,
  })
  const locale = language ?? getRequestLocale(event)
  return getTmdbClient().trending(kindFromSegment(kind), page, locale)
})

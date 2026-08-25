import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../../../tmdb/client'
import { kindFromSegment } from '../../../../tmdb/mappers'
import { getRequestLocale } from '../../../../utils/locale'
import { idParam, languageParam, mediaSegmentParam, pageParam } from '../../../../utils/params'
import { parseOrThrow } from '../../../../utils/validation'

const recommendationParamsSchema = z.object({
  kind: mediaSegmentParam,
  id: idParam,
  page: pageParam,
  language: languageParam,
})

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { kind, id, page, language } = parseOrThrow(recommendationParamsSchema, {
    kind: getRouterParam(event, 'kind'),
    id: getRouterParam(event, 'id'),
    page: Array.isArray(query.page) ? query.page[0] : query.page,
    language: Array.isArray(query.language) ? query.language[0] : query.language,
  })
  const locale = language ?? getRequestLocale(event)
  return getTmdbClient().recommendations(kindFromSegment(kind), id, page, locale)
})

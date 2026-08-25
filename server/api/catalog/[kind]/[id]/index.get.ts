import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../../../tmdb/client'
import { kindFromSegment } from '../../../../tmdb/mappers'
import { getRequestLocale } from '../../../../utils/locale'
import { idParam, languageParam, mediaSegmentParam } from '../../../../utils/params'
import { parseOrThrow } from '../../../../utils/validation'

const titleParamsSchema = z.object({
  kind: mediaSegmentParam,
  id: idParam,
  language: languageParam,
})

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { kind, id, language } = parseOrThrow(titleParamsSchema, {
    kind: getRouterParam(event, 'kind'),
    id: getRouterParam(event, 'id'),
    language: Array.isArray(query.language) ? query.language[0] : query.language,
  })
  const locale = language ?? getRequestLocale(event)
  return getTmdbClient().title(kindFromSegment(kind), id, locale)
})

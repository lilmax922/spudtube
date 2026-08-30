import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../tmdb/client'
import { kindFromSegment } from '../../tmdb/mappers'
import { getRequestLocale } from '../../utils/locale'
import { languageParam, mediaSegmentParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const providerListQuerySchema = z.object({
  kind: mediaSegmentParam,
  language: languageParam,
})

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { kind, language } = parseOrThrow(providerListQuerySchema, {
    kind: Array.isArray(query.kind) ? query.kind[0] : query.kind,
    language: Array.isArray(query.language) ? query.language[0] : query.language,
  })
  const locale = language ?? getRequestLocale(event)
  return getTmdbClient().watchProviderList(kindFromSegment(kind), locale)
})

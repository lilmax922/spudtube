import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../tmdb/client'
import { kindFromSegment } from '../../tmdb/mappers'
import { languageParam, mediaSegmentParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const genresQuerySchema = z.object({
  kind: mediaSegmentParam,
  language: languageParam,
})

export default defineEventHandler((event) => {
  const { kind, language } = parseOrThrow(genresQuerySchema, getQuery(event))
  return getTmdbClient().genres(kindFromSegment(kind), language)
})

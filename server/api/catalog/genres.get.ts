import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../tmdb/client'
import { kindFromSegment } from '../../tmdb/mappers'
import { mediaSegmentParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const genresQuerySchema = z.object({
  kind: mediaSegmentParam,
})

export default defineEventHandler((event) => {
  const { kind } = parseOrThrow(genresQuerySchema, getQuery(event))
  return getTmdbClient().genres(kindFromSegment(kind))
})

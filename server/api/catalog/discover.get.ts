import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../tmdb/client'
import { kindFromSegment } from '../../tmdb/mappers'
import { getRequestLocale } from '../../utils/locale'
import { genreIdsParam, languageParam, mediaSegmentParam, pageParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const discoverQuerySchema = z.object({
  kind: mediaSegmentParam,
  genres: genreIdsParam.optional(),
  page: pageParam,
  language: languageParam,
})

export default defineEventHandler((event) => {
  const { kind, genres, page, language } = parseOrThrow(discoverQuerySchema, getQuery(event))
  const locale = language ?? getRequestLocale(event)
  return getTmdbClient().discover(kindFromSegment(kind), { genreIds: genres, page, language: locale })
})

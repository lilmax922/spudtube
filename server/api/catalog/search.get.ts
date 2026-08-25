import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../tmdb/client'
import { languageParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const searchQuerySchema = z.object({
  query: z.string().trim().min(1),
  page: z.coerce.number().int().min(1).default(1),
  language: languageParam,
})

export default defineEventHandler((event) => {
  const { query, page, language } = parseOrThrow(searchQuerySchema, getQuery(event))
  return getTmdbClient().searchMulti(query, page, language)
})

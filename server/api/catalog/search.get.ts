import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../tmdb/client'
import { parseOrThrow } from '../../utils/validation'

const searchQuerySchema = z.object({
  query: z.string().trim().min(1),
  page: z.coerce.number().int().min(1).default(1),
})

export default defineEventHandler((event) => {
  const { query, page } = parseOrThrow(searchQuerySchema, getQuery(event))
  return getTmdbClient().searchMulti(query, page)
})

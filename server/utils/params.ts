import { z } from 'zod'

export const mediaSegmentParam = z.enum(['movie', 'tv'])

export const languageParam = z.enum(['zh-TW', 'en']).default('zh-TW')

export const idParam = z.coerce.number().int().positive()

export const pageParam = z.coerce.number().int().min(1).default(1)

export const genreIdsParam = z
  .string()
  .regex(/^\d+(,\d+)*$/, 'must be a comma-separated list of TMDB genre ids')
  .transform(value => value.split(',').map(Number))

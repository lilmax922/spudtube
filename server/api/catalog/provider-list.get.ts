import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../tmdb/client'
import { kindFromSegment } from '../../tmdb/mappers'
import { getRequestLocale } from '../../utils/locale'
import { languageParam, mediaSegmentParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const POPULAR_LIMIT = 12
const SEARCH_LIMIT = 24

const providerListQuerySchema = z.object({
  kind: mediaSegmentParam,
  language: languageParam,
  q: z.string().trim().min(1).max(64).optional(),
  popular: z
    .enum(['1', 'true', '0', 'false'])
    .optional()
    .transform(value => value === '1' || value === 'true'),
})

function sortByPriority(providers: { id: number, name: string, logoPath: string | null, displayPriority?: number }[]) {
  return [...providers].sort((a, b) => {
    const pa = a.displayPriority ?? 100
    const pb = b.displayPriority ?? 100
    if (pa !== pb)
      return pa - pb
    return a.name.localeCompare(b.name)
  })
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { kind, language, q, popular } = parseOrThrow(providerListQuerySchema, {
    kind: Array.isArray(query.kind) ? query.kind[0] : query.kind,
    language: Array.isArray(query.language) ? query.language[0] : query.language,
    q: Array.isArray(query.q) ? query.q[0] : query.q,
    popular: Array.isArray(query.popular) ? query.popular[0] : query.popular,
  })
  const locale = language ?? getRequestLocale(event)
  const all = await getTmdbClient().watchProviderList(kindFromSegment(kind), locale)

  if (q) {
    const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')
    const needle = normalize(q)
    const filtered = all.filter(p => normalize(p.name).includes(needle))
    return sortByPriority(filtered).slice(0, SEARCH_LIMIT)
  }

  if (popular) {
    return sortByPriority(all).slice(0, POPULAR_LIMIT)
  }

  return [...all].sort((a, b) => a.name.localeCompare(b.name))
})

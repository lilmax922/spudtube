import { getCookie, getHeader, getQuery } from 'h3'
import { defineCachedEventHandler } from 'nitropack/runtime'
import { z } from 'zod'
import { COUNTRY_HEADER } from '../../../shared/i18n/locale'
import { DEFAULT_REGION, REGION_COOKIE, resolveSelectedRegion } from '../../../shared/region/region'
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

function resolveRegion(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]): string {
  const cookieRegion = getCookie(event, REGION_COOKIE)
  const detectedCountry = getHeader(event, COUNTRY_HEADER) ?? getHeader(event, 'cf-ipcountry')
  try {
    return resolveSelectedRegion(cookieRegion, detectedCountry ?? undefined)
  }
  catch {
    return DEFAULT_REGION
  }
}

export default defineCachedEventHandler(async (event) => {
  const query = getQuery(event)
  const { kind, language, q, popular } = parseOrThrow(providerListQuerySchema, {
    kind: Array.isArray(query.kind) ? query.kind[0] : query.kind,
    language: Array.isArray(query.language) ? query.language[0] : query.language,
    q: Array.isArray(query.q) ? query.q[0] : query.q,
    popular: Array.isArray(query.popular) ? query.popular[0] : query.popular,
  })
  const locale = language ?? getRequestLocale(event)
  const watchRegion = resolveRegion(event)
  const all = await getTmdbClient().watchProviderList(kindFromSegment(kind), locale, watchRegion)

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
}, {
  // The list varies by region, so the region joins the key: without it a cached
  // TW list would be served to US visitors. Typed search bypasses the cache —
  // every keystroke combination would otherwise pin its own entry.
  maxAge: 21600,
  swr: false,
  // varies keeps the region inputs visible to the handler: Nitro strips every
  // non-varies header before the handler runs, which would blind resolveRegion
  // while getKey (built on the original event) still keyed by region.
  varies: ['cookie', 'cf-ipcountry'],
  getKey: (event) => {
    const query = getQuery(event)
    const first = (value: unknown): string | undefined => Array.isArray(value) ? value[0] as string : value as string | undefined
    const language = first(query.language) ?? getRequestLocale(event)
    const popular = first(query.popular) ?? ''
    return `provider-list:${first(query.kind)}:${resolveRegion(event)}:${language}:${popular}`
  },
  shouldBypassCache: (event) => {
    const q = getQuery(event).q
    const value = Array.isArray(q) ? q[0] : q
    return typeof value === 'string' && value.trim().length > 0
  },
})

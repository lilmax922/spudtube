import type { Provider } from '../../tmdb/types'
import { defineEventHandler, getCookie, getHeader, getQuery } from 'h3'
import { z } from 'zod'
import { COUNTRY_HEADER } from '../../../shared/i18n/locale'
import {
  DEFAULT_REGION,
  REGION_COOKIE,
  resolveSelectedRegion,
} from '../../../shared/region/region'
import { getTmdbClient } from '../../tmdb/client'
import { kindFromSegment } from '../../tmdb/mappers'
import { languageParam, mediaSegmentParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

const providersQuerySchema = z.object({
  kind: mediaSegmentParam,
  ids: z
    .string()
    .regex(/^\d+(,\d+)*$/, 'must be a comma-separated list of TMDB ids'),
  language: languageParam,
})

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

export default defineEventHandler(async (event): Promise<Record<string, Provider[]>> => {
  const query = getQuery(event)
  const parsed = parseOrThrow(providersQuerySchema, {
    kind: Array.isArray(query.kind) ? query.kind[0] : query.kind,
    ids: Array.isArray(query.ids) ? query.ids[0] : query.ids,
    language: Array.isArray(query.language) ? query.language[0] : query.language,
  })
  const kind = kindFromSegment(parsed.kind)
  const ids = parsed.ids.split(',').map(Number)
  const region = resolveRegion(event)
  const client = getTmdbClient()

  const entries = await Promise.all(ids.map(async (tmdbId): Promise<[string, Provider[]]> => {
    try {
      const catalog = await client.watchProviders(kind, tmdbId)
      const regionEntry = catalog?.[region]
      if (!regionEntry)
        return [String(tmdbId), []]
      const map = new Map<number, Provider>()
      for (const list of [
        regionEntry.groups.subscription,
        regionEntry.groups.free,
        regionEntry.groups.rent,
        regionEntry.groups.buy,
      ]) {
        for (const provider of list) {
          if (!map.has(provider.id))
            map.set(provider.id, provider)
        }
      }
      return [String(tmdbId), [...map.values()]]
    }
    catch {
      return [String(tmdbId), []]
    }
  }))

  return Object.fromEntries(entries)
})

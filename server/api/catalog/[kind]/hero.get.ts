import type { Provider, TitleSummary } from '../../../tmdb/types'
import { defineEventHandler, getCookie, getHeader, getQuery, getRouterParam } from 'h3'
import { z } from 'zod'
import { COUNTRY_HEADER } from '../../../../shared/i18n/locale'
import {
  DEFAULT_REGION,
  REGION_COOKIE,
  resolveSelectedRegion,
} from '../../../../shared/region/region'
import { getTmdbClient } from '../../../tmdb/client'
import { kindFromSegment } from '../../../tmdb/mappers'
import { getRequestLocale } from '../../../utils/locale'
import { languageParam, mediaSegmentParam, pageParam } from '../../../utils/params'
import { parseOrThrow } from '../../../utils/validation'

const HERO_LIMIT = 5

export interface HeroTitle extends TitleSummary {
  runtimeMinutes: number | null
  contentRating: string | null
  genres: { id: number, name: string }[]
  providers: Provider[]
}

export interface HeroPayload {
  results: HeroTitle[]
}

const heroQuerySchema = z.object({
  kind: mediaSegmentParam,
  page: pageParam,
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

export default defineEventHandler(async (event): Promise<HeroPayload> => {
  const query = getQuery(event)
  const { kind, page, language } = parseOrThrow(heroQuerySchema, {
    kind: getRouterParam(event, 'kind'),
    page: Array.isArray(query.page) ? query.page[0] : query.page,
    language: Array.isArray(query.language) ? query.language[0] : query.language,
  })
  const locale = language ?? getRequestLocale(event)
  const region = resolveRegion(event)
  const client = getTmdbClient()
  const trending = await client.trending(kindFromSegment(kind), page, locale)
  const sorted = [...trending.results].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0))
  const HERO_POOL_SIZE = 12
  const pool = sorted.slice(0, Math.min(sorted.length, HERO_POOL_SIZE))

  const enrichedPool = await Promise.all(pool.map(async (title): Promise<HeroTitle> => {
    const [detail, catalog] = await Promise.all([
      client.title(title.kind, title.tmdbId, locale),
      client.watchProviders(title.kind, title.tmdbId, locale).catch(() => null),
    ])
    if (!detail)
      return { ...title, runtimeMinutes: null, contentRating: null, genres: [], providers: [] }
    const regionEntry = catalog?.[region]
    const providerMap = new Map<number, Provider>()
    if (regionEntry) {
      for (const list of [
        regionEntry.groups.subscription,
        regionEntry.groups.free,
        regionEntry.groups.rent,
        regionEntry.groups.buy,
      ]) {
        for (const provider of list) {
          if (!providerMap.has(provider.id))
            providerMap.set(provider.id, provider)
        }
      }
    }
    return {
      ...title,
      backdropPath: detail.backdropPath ?? title.backdropPath,
      runtimeMinutes: detail.runtimeMinutes,
      contentRating: detail.contentRating,
      genres: detail.genres,
      providers: [...providerMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    }
  }))

  const withBackdrop = enrichedPool.filter(item => item.backdropPath != null)
  const results = withBackdrop.length > 0
    ? withBackdrop.slice(0, HERO_LIMIT)
    : enrichedPool.slice(0, HERO_LIMIT)

  return { results }
})

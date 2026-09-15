import type { Provider, TitleSummary } from '../../../tmdb/types'
import { createError, getCookie, getHeader, getQuery, getRouterParam } from 'h3'
import { defineCachedEventHandler } from 'nitropack/runtime'
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

interface EnrichedHero {
  hero: HeroTitle
  detailed: boolean
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

export default defineCachedEventHandler(async (event): Promise<HeroPayload> => {
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

  const enrichedPool = await Promise.all(pool.map(async (title): Promise<EnrichedHero> => {
    const [detail, catalog] = await Promise.all([
      client.title(title.kind, title.tmdbId, locale).catch(() => null),
      client.watchProviders(title.kind, title.tmdbId, locale).catch(() => null),
    ])
    if (!detail)
      return { hero: { ...title, runtimeMinutes: null, contentRating: null, genres: [], providers: [] }, detailed: false }
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
      hero: {
        ...title,
        backdropPath: detail.backdropPath ?? title.backdropPath,
        runtimeMinutes: detail.runtimeMinutes,
        contentRating: detail.contentRating,
        genres: detail.genres,
        providers: [...providerMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      },
      detailed: true,
    }
  }))

  // Partial-outage guard: when trending succeeds but every detail lookup
  // fails, the pool is fully detail-stripped. Throwing (instead of serving a
  // 200 of nulls/empties) keeps the failed revalidation out of the cache, so
  // SWR keeps serving the healthy stale entry and heals on the next success.
  // A partially enriched pool still serves with its degraded stragglers kept.
  if (enrichedPool.length > 0 && enrichedPool.every(entry => !entry.detailed)) {
    throw createError({ statusCode: 502, statusMessage: 'TMDB upstream error' })
  }
  const heroes = enrichedPool.map(entry => entry.hero)

  const withBackdrop = heroes.filter(item => item.backdropPath != null)
  const results = withBackdrop.length > 0
    ? withBackdrop.slice(0, HERO_LIMIT)
    : heroes.slice(0, HERO_LIMIT)

  return { results }
}, {
  // Providers vary by region, so the region joins the key: without it a cached
  // TW payload would be served to US visitors.
  maxAge: 21600,
  // Source fix for the PR70 skeleton-forever outage: swr serves the stale
  // entry instantly while the expired slot revalidates in the background, so
  // a stalled TMDB upstream no longer blocks the homepage on a live fetch
  // (the Nitro pending slot pins every same-key request with it). Thrown
  // 5xx/timeouts never populate the cache, so the stale entry survives a
  // failed revalidation and heals on the next success. staleMaxAge bounds
  // the downstream stale-while-revalidate window to a day.
  swr: true,
  staleMaxAge: 86400,
  // varies keeps the region inputs visible to the handler: Nitro strips every
  // non-varies header before the handler runs, which would blind resolveRegion
  // while getKey (built on the original event) still keyed by region.
  varies: ['cookie', 'cf-ipcountry'],
  getKey: (event) => {
    const query = getQuery(event)
    const language = (Array.isArray(query.language) ? query.language[0] : query.language) ?? getRequestLocale(event)
    const page = Array.isArray(query.page) ? query.page[0] : query.page ?? '1'
    return `hero:${getRouterParam(event, 'kind')}:${resolveRegion(event)}:${language}:${page}`
  },
})

import type { H3Event } from 'h3'
import type { Kind, Provider, ProviderCatalog, TitleDetail, TitleSummary } from '../tmdb/types'
import { defineEventHandler, getCookie, getHeader, getQuery } from 'h3'
import { z } from 'zod'
import { COUNTRY_HEADER } from '../../shared/i18n/locale'
import { DEFAULT_REGION, REGION_COOKIE, resolveSelectedRegion } from '../../shared/region/region'
import { getDb } from '../db'
import { findRatings } from '../db/queries/rating'
import { findTitleStatuses } from '../db/queries/title-status'
import { getTmdbClient } from '../tmdb/client'
import { requireAuthSession } from '../utils/auth'
import { getRequestLocale } from '../utils/locale'
import { languageParam } from '../utils/params'
import { parseOrThrow } from '../utils/validation'

export type MonetizationTag = 'subscription' | 'buy' | 'rent' | 'free'

export interface MyListEntry {
  kind: Kind
  tmdbId: number
  // null when the referenced Title is no longer in the TMDB catalog — renders as a degraded entry.
  title: TitleSummary | null
  // Monetization buckets this entry falls into for the resolved Region. Empty when
  // no provider data is available for the Region (titles not streamed in the Region
  // still appear in the list, just unfilterable on the monetization axis).
  monetization: MonetizationTag[]
  // Distinct providers available in the resolved Region, deduplicated and sorted
  // by name; drives the provider-chip strip in the filter bar.
  providers: Provider[]
}

export interface MyList {
  watchlist: MyListEntry[]
  watched: MyListEntry[]
  rated: MyListEntry[]
  region: string
}

function toTitleSummary(detail: TitleDetail): TitleSummary {
  return {
    kind: detail.kind,
    tmdbId: detail.tmdbId,
    name: detail.name,
    posterPath: detail.posterPath,
    backdropPath: detail.backdropPath,
    releaseDate: detail.releaseDate,
    voteAverage: detail.voteAverage,
  }
}

const myListQuerySchema = z.object({
  language: languageParam,
})

function resolveRequestRegion(event: H3Event): string {
  const cookieRegion = getCookie(event, REGION_COOKIE)
  const detectedCountry = getHeader(event, COUNTRY_HEADER) ?? getHeader(event, 'cf-ipcountry')
  // Region is informational — provider aggregation must never crash the whole endpoint.
  try {
    return resolveSelectedRegion(cookieRegion, detectedCountry ?? undefined)
  }
  catch {
    return DEFAULT_REGION
  }
}

function deriveMonetization(catalog: ProviderCatalog | null, region: string): { monetization: MonetizationTag[], providers: Provider[] } {
  if (!catalog)
    return { monetization: [], providers: [] }
  const regionEntry = catalog[region]
  if (!regionEntry)
    return { monetization: [], providers: [] }
  const { groups } = regionEntry
  const monetization: MonetizationTag[] = []
  if (groups.subscription.length > 0)
    monetization.push('subscription')
  if (groups.buy.length > 0)
    monetization.push('buy')
  if (groups.rent.length > 0)
    monetization.push('rent')
  if (groups.free.length > 0)
    monetization.push('free')
  const providerMap = new Map<number, Provider>()
  for (const list of [groups.subscription, groups.free, groups.rent, groups.buy]) {
    for (const provider of list) {
      if (!providerMap.has(provider.id))
        providerMap.set(provider.id, provider)
    }
  }
  const providers = [...providerMap.values()].sort((a, b) => a.name.localeCompare(b.name))
  return { monetization, providers }
}

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { language } = parseOrThrow(myListQuerySchema, getQuery(event))
  const locale = language ?? getRequestLocale(event)
  const region = resolveRequestRegion(event)
  const db = getDb(event)

  const [statuses, ratings] = await Promise.all([
    findTitleStatuses(db, session.user.id),
    findRatings(db, session.user.id),
  ])

  const watchlist = statuses.filter(row => row.status === 'WATCHLISTED')
  const watched = statuses.filter(row => row.status === 'WATCHED')
  const rated = ratings.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  // One batched fetch per unique reference across all three tabs, then each tab joins
  // its stored references with the live detail. A missing OR failing title degrades to
  // null so one bad reference never takes down the whole list.
  const references = new Map<string, { kind: Kind, tmdbId: number }>()
  for (const row of [...watchlist, ...watched, ...rated]) {
    references.set(`${row.kind}:${row.tmdbId}`, { kind: row.kind, tmdbId: row.tmdbId })
  }
  const details = new Map<string, TitleSummary | null>()
  const catalogs = new Map<string, ProviderCatalog | null>()
  const client = getTmdbClient()
  await Promise.all([...references.values()].map(async ({ kind, tmdbId }) => {
    const key = `${kind}:${tmdbId}`
    try {
      const [detail, catalog] = await Promise.all([
        client.title(kind, tmdbId, locale),
        client.watchProviders(kind, tmdbId, locale),
      ])
      details.set(key, detail ? toTitleSummary(detail) : null)
      catalogs.set(key, catalog)
    }
    catch {
      details.set(key, null)
      catalogs.set(key, null)
    }
  }))

  function entries(rows: Array<{ kind: Kind, tmdbId: number }>): MyListEntry[] {
    return rows.map((row) => {
      const key = `${row.kind}:${row.tmdbId}`
      const derived = deriveMonetization(catalogs.get(key) ?? null, region)
      return {
        kind: row.kind,
        tmdbId: row.tmdbId,
        title: details.get(key) ?? null,
        monetization: derived.monetization,
        providers: derived.providers,
      }
    })
  }

  return {
    watchlist: entries(watchlist),
    watched: entries(watched),
    rated: entries(rated),
    region,
  }
})

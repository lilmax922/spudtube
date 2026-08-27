import type { DiscoveryBadges } from '../../../tmdb/types'
import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { z } from 'zod'
import { getTmdbClient } from '../../../tmdb/client'
import { kindFromSegment } from '../../../tmdb/mappers'
import { getRequestLocale } from '../../../utils/locale'
import { languageParam, mediaSegmentParam } from '../../../utils/params'
import { parseOrThrow } from '../../../utils/validation'

const badgeParamsSchema = z.object({
  kind: mediaSegmentParam,
  language: languageParam,
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { kind, language } = parseOrThrow(badgeParamsSchema, {
    kind: getRouterParam(event, 'kind'),
    language: Array.isArray(query.language) ? query.language[0] : query.language,
  })
  const locale = language ?? getRequestLocale(event)
  const client = getTmdbClient()
  const [trending, topRated] = await Promise.all([
    client.trending(kindFromSegment(kind), 1, locale),
    client.topRated(kindFromSegment(kind), 1, locale),
  ])
  const badges: DiscoveryBadges = {
    trendingIds: trending.results.map(title => title.tmdbId),
    topRatedIds: topRated.results.map(title => title.tmdbId),
  }
  return badges
})

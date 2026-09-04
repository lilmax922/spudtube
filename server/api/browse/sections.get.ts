import type { SectionDefinition } from '../../browse/sections'
import type { Kind, TitleSummary } from '../../tmdb/types'
import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { MIN_TITLES_PER_SECTION, sectionsForKind } from '../../browse/sections'
import { getTmdbClient } from '../../tmdb/client'
import { kindFromSegment } from '../../tmdb/mappers'
import { getRequestLocale } from '../../utils/locale'
import { languageParam, mediaSegmentParam } from '../../utils/params'
import { parseOrThrow } from '../../utils/validation'

export interface BrowseSection {
  key: string
  titleKey: string
  genres: number[]
  minRating: number | null
  titles: TitleSummary[]
}

export interface BrowseSectionsPayload {
  kind: 'movie' | 'tv'
  sections: BrowseSection[]
}

const sectionsQuerySchema = z.object({
  kind: mediaSegmentParam,
  language: languageParam,
})

async function fetchSectionTitles(
  kind: Kind,
  definition: SectionDefinition,
  language: 'zh-TW' | 'en',
): Promise<TitleSummary[]> {
  const client = getTmdbClient()
  const query = definition.query
  switch (query.source) {
    case 'trending':
      return (await client.trending(kind, 1, language, query.trendingWindow ?? 'week')).results
    case 'topRated':
      return (await client.topRated(kind, 1, language)).results
    case 'popular':
      return (await client.popular(kind, 1, language)).results
    case 'nowPlaying':
      return (await client.nowPlaying(kind, 1, language)).results
    case 'upcoming':
      return (await client.upcoming(kind, 1, language)).results
    case 'airingToday':
      return (await client.airingToday(kind, 1, language)).results
    case 'onTheAir':
      return (await client.onTheAir(kind, 1, language)).results
    case 'discover':
      return (await client.discover(kind, {
        genreIds: query.genreIds,
        keywordIds: query.keywordIds,
        minRating: query.minRating,
        minVoteCount: query.minVoteCount,
        sortBy: query.sortBy,
        releaseDateGte: query.releaseDateGte,
        releaseDateLte: query.releaseDateLte,
        firstAirDateGte: query.firstAirDateGte,
        firstAirDateLte: query.firstAirDateLte,
        page: 1,
        language,
      })).results
  }
}

export default defineEventHandler(async (event): Promise<BrowseSectionsPayload> => {
  const { kind, language } = parseOrThrow(sectionsQuerySchema, getQuery(event))
  const locale = language ?? getRequestLocale(event)
  // Region is intentionally absent: it only affects provider information,
  // never which titles appear in a row.
  const definitions = sectionsForKind(kindFromSegment(kind))
  const settled = await Promise.all(definitions.map(async (definition): Promise<BrowseSection | null> => {
    try {
      const titles = await fetchSectionTitles(kindFromSegment(kind), definition, locale)
      if (titles.length < MIN_TITLES_PER_SECTION)
        return null
      return {
        key: definition.key,
        titleKey: definition.titleKey,
        genres: definition.query.genreIds ?? [],
        minRating: definition.query.minRating ?? null,
        titles,
      }
    }
    catch (error) {
      console.error(`[browse-sections] row ${definition.key} failed, omitting`, error)
      return null
    }
  }))
  return {
    kind,
    sections: settled.filter((section): section is BrowseSection => section !== null),
  }
})

import type { Kind, TitleDetail, TitleSummary } from '../tmdb/types'
import { defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { getDb } from '../db'
import { findRatings } from '../db/queries/rating'
import { findTitleStatuses } from '../db/queries/title-status'
import { getTmdbClient } from '../tmdb/client'
import { requireAuthSession } from '../utils/auth'
import { getRequestLocale } from '../utils/locale'
import { languageParam } from '../utils/params'
import { parseOrThrow } from '../utils/validation'

export interface MyListEntry {
  kind: Kind
  tmdbId: number
  // null when the referenced Title is no longer in the TMDB catalog — renders as a degraded entry.
  title: TitleSummary | null
}

export interface MyList {
  watchlist: MyListEntry[]
  watched: MyListEntry[]
  rated: MyListEntry[]
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

export default defineEventHandler(async (event) => {
  const session = await requireAuthSession(event)
  const { language } = parseOrThrow(myListQuerySchema, getQuery(event))
  const locale = language ?? getRequestLocale(event)
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
  await Promise.all([...references.values()].map(async ({ kind, tmdbId }) => {
    try {
      const detail = await getTmdbClient().title(kind, tmdbId, locale)
      details.set(`${kind}:${tmdbId}`, detail ? toTitleSummary(detail) : null)
    }
    catch {
      details.set(`${kind}:${tmdbId}`, null)
    }
  }))

  function entries(rows: Array<{ kind: Kind, tmdbId: number }>): MyListEntry[] {
    return rows.map(row => ({
      kind: row.kind,
      tmdbId: row.tmdbId,
      title: details.get(`${row.kind}:${row.tmdbId}`) ?? null,
    }))
  }

  return {
    watchlist: entries(watchlist),
    watched: entries(watched),
    rated: entries(rated),
  }
})

import type { z } from 'zod'
import type { Db } from '../index'
import type { Kind } from '../schema/kind'
import type { InsertRatingSchema, Rating } from '../schema/rating'
import { and, eq } from 'drizzle-orm'
import { rating } from '../schema/rating'

function scopedToUserTitle(userId: string, kind: Kind, tmdbId: number) {
  return and(
    eq(rating.userId, userId),
    eq(rating.kind, kind),
    eq(rating.tmdbId, tmdbId),
  )
}

export async function findRating(db: Db, userId: string, kind: Kind, tmdbId: number): Promise<Rating | undefined> {
  const [found] = await db.select()
    .from(rating)
    .where(scopedToUserTitle(userId, kind, tmdbId))
    .limit(1)
  return found
}

export async function findRatings(db: Db, userId: string): Promise<Rating[]> {
  return await db.select().from(rating).where(eq(rating.userId, userId))
}

export async function upsertRating(db: Db, userId: string, payload: z.output<typeof InsertRatingSchema>): Promise<Rating> {
  const [saved] = await db.insert(rating)
    .values({ ...payload, userId })
    .onConflictDoUpdate({
      target: [rating.userId, rating.kind, rating.tmdbId],
      set: { label: payload.label, updatedAt: new Date() },
    })
    .returning()
  if (!saved)
    throw new Error('rating upsert yielded no row')
  return saved
}

export async function deleteRating(db: Db, userId: string, kind: Kind, tmdbId: number): Promise<Rating | undefined> {
  const [deleted] = await db.delete(rating)
    .where(scopedToUserTitle(userId, kind, tmdbId))
    .returning()
  return deleted
}

import type { z } from 'zod'
import type { Db } from '../index'
import type { Kind } from '../schema/kind'
import type { InsertTitleStatusSchema, TitleStatus } from '../schema/title-status'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { titleStatus } from '../schema/title-status'

function scopedToUserTitle(userId: string, kind: Kind, tmdbId: number) {
  return and(
    eq(titleStatus.userId, userId),
    eq(titleStatus.kind, kind),
    eq(titleStatus.tmdbId, tmdbId),
  )
}

export async function findTitleStatus(
  db: Db,
  userId: string,
  kind: Kind,
  tmdbId: number,
): Promise<TitleStatus | undefined> {
  const [found] = await db.select()
    .from(titleStatus)
    .where(scopedToUserTitle(userId, kind, tmdbId))
    .limit(1)
  return found
}

export async function findTitleStatuses(
  db: Db,
  userId: string,
): Promise<TitleStatus[]> {
  return await db.select()
    .from(titleStatus)
    .where(and(eq(titleStatus.userId, userId), isNotNull(titleStatus.status)))
    .orderBy(desc(titleStatus.updatedAt))
}

// The single-row upsert IS the state machine: exactly one state per User×Title, and
// setting a new status overwrites whatever was there (WATCHED overwrites WATCHLISTED,
// re-watchlisting moves a WATCHED Title back).
export async function upsertTitleStatus(
  db: Db,
  userId: string,
  payload: z.output<typeof InsertTitleStatusSchema>,
): Promise<TitleStatus> {
  const [saved] = await db.insert(titleStatus)
    .values({ ...payload, userId })
    .onConflictDoUpdate({
      target: [titleStatus.userId, titleStatus.kind, titleStatus.tmdbId],
      set: { status: payload.status, updatedAt: new Date() },
    })
    .returning()
  if (!saved)
    throw new Error('title status upsert yielded no row')
  return saved
}

// Clearing sets NULL in place rather than deleting the row (ADR 0003).
export async function clearTitleStatus(
  db: Db,
  userId: string,
  kind: Kind,
  tmdbId: number,
): Promise<TitleStatus | undefined> {
  const [cleared] = await db.update(titleStatus)
    .set({ status: null, updatedAt: new Date() })
    .where(scopedToUserTitle(userId, kind, tmdbId))
    .returning()
  return cleared
}

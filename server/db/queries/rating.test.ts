import type { Db } from '../index'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../index'
import { rating, user } from '../schema'
import { deleteRating, findRating, findRatings, upsertRating } from './rating'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://spudtube:spudtube@localhost:5432/spudtube'

let db: Db

beforeAll(async () => {
  db = createDb(DATABASE_URL)
  await migrate(db, { migrationsFolder: resolve('server/db/migrations') })
})

beforeEach(async () => {
  await db.execute(sql`TRUNCATE ${user}, ${rating} CASCADE`)
})

afterAll(async () => {
  await db.$client.end()
})

async function seedUser(): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(user).values({ email: `${id}@example.com`, emailVerified: false, id, name: 'Spud Tester' })
  return id
}

describe('rating queries', () => {
  it('upsertRating inserts a verdict and returns it', async () => {
    const userId = await seedUser()

    const saved = await upsertRating(db, userId, { kind: 'MOVIE', tmdbId: 424, label: 'GOOD' })

    expect(saved).toMatchObject({ kind: 'MOVIE', label: 'GOOD', tmdbId: 424, userId })
    expect(saved.createdAt).toBeInstanceOf(Date)
    expect(saved.updatedAt).toBeInstanceOf(Date)
  })

  it('upsertRating re-rates in place instead of duplicating', async () => {
    const userId = await seedUser()
    await upsertRating(db, userId, { kind: 'MOVIE', tmdbId: 424, label: 'GOOD' })

    await upsertRating(db, userId, { kind: 'MOVIE', tmdbId: 424, label: 'AWESOME' })

    const rows = await findRatings(db, userId)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.label).toBe('AWESOME')
  })

  it('findRating scopes by user identity and full composite key', async () => {
    const userA = await seedUser()
    const userB = await seedUser()
    await upsertRating(db, userA, { kind: 'MOVIE', tmdbId: 424, label: 'AWESOME' })
    await upsertRating(db, userB, { kind: 'MOVIE', tmdbId: 424, label: 'SUCKS' })

    expect((await findRating(db, userA, 'MOVIE', 424))?.label).toBe('AWESOME')
    expect((await findRating(db, userB, 'MOVIE', 424))?.label).toBe('SUCKS')
    expect(await findRating(db, userA, 'TV_SHOW', 424)).toBeUndefined()
    expect(await findRating(db, crypto.randomUUID(), 'MOVIE', 424)).toBeUndefined()
  })

  it('findRatings lists only the owning user rows', async () => {
    const userA = await seedUser()
    const userB = await seedUser()
    await upsertRating(db, userA, { kind: 'MOVIE', tmdbId: 424, label: 'GOOD' })
    await upsertRating(db, userA, { kind: 'TV_SHOW', tmdbId: 1399, label: 'AWESOME' })
    await upsertRating(db, userB, { kind: 'MOVIE', tmdbId: 424, label: 'SUCKS' })

    const rows = await findRatings(db, userA)

    expect(rows).toHaveLength(2)
    expect(rows.every(row => row.userId === userA)).toBe(true)
  })

  it('deleteRating removes and returns exactly the scoped row', async () => {
    const userA = await seedUser()
    const userB = await seedUser()
    await upsertRating(db, userA, { kind: 'MOVIE', tmdbId: 424, label: 'GOOD' })
    await upsertRating(db, userB, { kind: 'MOVIE', tmdbId: 424, label: 'SUCKS' })

    const deleted = await deleteRating(db, userA, 'MOVIE', 424)

    expect(deleted?.label).toBe('GOOD')
    expect(await findRating(db, userA, 'MOVIE', 424)).toBeUndefined()
    expect(await findRating(db, userB, 'MOVIE', 424)).toBeDefined()
    expect(await deleteRating(db, userA, 'MOVIE', 424)).toBeUndefined()
  })
})

import type { Db } from '../index'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createDb } from '../index'
import { titleStatus, user } from '../schema'
import { clearTitleStatus, findTitleStatus, findTitleStatuses, upsertTitleStatus } from './title-status'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://spudtube:spudtube@localhost:5432/spudtube'

let db: Db

beforeAll(async () => {
  db = createDb(DATABASE_URL)
  await migrate(db, { migrationsFolder: resolve('server/db/migrations') })
})

beforeEach(async () => {
  await db.execute(sql`TRUNCATE ${user}, ${titleStatus} CASCADE`)
})

afterAll(async () => {
  await db.$client.end()
})

async function seedUser(): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(user).values({ email: `${id}@example.com`, emailVerified: false, id, name: 'Spud Tester' })
  return id
}

describe('title status queries', () => {
  it('upsertTitleStatus inserts a state and returns it', async () => {
    const userId = await seedUser()

    const saved = await upsertTitleStatus(db, userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })

    expect(saved).toMatchObject({ kind: 'MOVIE', status: 'WATCHLISTED', tmdbId: 424, userId })
    expect(saved.createdAt).toBeInstanceOf(Date)
    expect(saved.updatedAt).toBeInstanceOf(Date)
  })

  it('upsertTitleStatus updates the single row in place across transitions', async () => {
    const userId = await seedUser()
    await upsertTitleStatus(db, userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })

    await upsertTitleStatus(db, userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHED' })

    const rows = await findTitleStatuses(db, userId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'WATCHED', tmdbId: 424 })

    await upsertTitleStatus(db, userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })
    expect((await findTitleStatuses(db, userId))[0]).toMatchObject({ status: 'WATCHLISTED' })
  })

  it('clearTitleStatus sets NULL in place instead of deleting the row', async () => {
    const userId = await seedUser()
    await upsertTitleStatus(db, userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })

    const cleared = await clearTitleStatus(db, userId, 'MOVIE', 424)

    expect(cleared?.status).toBeNull()
    const row = await findTitleStatus(db, userId, 'MOVIE', 424)
    expect(row).toBeDefined()
    expect(row?.status).toBeNull()
  })

  it('findTitleStatus scopes by user identity and full composite key', async () => {
    const userA = await seedUser()
    const userB = await seedUser()
    await upsertTitleStatus(db, userA, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })
    await upsertTitleStatus(db, userB, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHED' })

    expect((await findTitleStatus(db, userA, 'MOVIE', 424))?.status).toBe('WATCHLISTED')
    expect((await findTitleStatus(db, userB, 'MOVIE', 424))?.status).toBe('WATCHED')
    expect(await findTitleStatus(db, userA, 'TV_SHOW', 424)).toBeUndefined()
    expect(await findTitleStatus(db, crypto.randomUUID(), 'MOVIE', 424)).toBeUndefined()
  })

  it('findTitleStatuses lists only the owning user rows with a live state', async () => {
    const userA = await seedUser()
    const userB = await seedUser()
    await upsertTitleStatus(db, userA, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })
    await upsertTitleStatus(db, userA, { kind: 'TV_SHOW', tmdbId: 1399, status: 'WATCHED' })
    await upsertTitleStatus(db, userB, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHED' })
    await upsertTitleStatus(db, userA, { kind: 'MOVIE', tmdbId: 999, status: 'WATCHLISTED' })
    await clearTitleStatus(db, userA, 'MOVIE', 999)

    const rows = await findTitleStatuses(db, userA)

    expect(rows).toHaveLength(2)
    expect(rows.every(row => row.userId === userA && row.status != null)).toBe(true)
    expect(rows.map(row => row.tmdbId).sort((a, b) => a - b)).toEqual([424, 1399])
  })
})

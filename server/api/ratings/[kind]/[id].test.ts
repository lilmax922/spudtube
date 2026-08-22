import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createApp, createRouter, toWebHandler } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getDb } from '../../../db'
import { findRatings } from '../../../db/queries/rating'
import { rating, user } from '../../../db/schema'
import { createSessionFixture } from '../../../utils/auth-fixture'
import ratingDelete from './[id].delete'
import ratingGet from './[id].get'
import ratingPut from './[id].put'

const db = getDb()

beforeAll(async () => {
  await migrate(db, { migrationsFolder: resolve('server/db/migrations') })
})

beforeEach(async () => {
  await db.execute(sql`TRUNCATE ${user}, ${rating} CASCADE`)
})

afterAll(async () => {
  await db.$client.end()
})

describe('rating routes (seam S2)', () => {
  const router = createRouter()
  router.get('/api/ratings/:kind/:id', ratingGet)
  router.put('/api/ratings/:kind/:id', ratingPut)
  router.delete('/api/ratings/:kind/:id', ratingDelete)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  async function ratedCall(method: 'GET' | 'PUT' | 'DELETE', cookie: string, body?: unknown): Promise<Response> {
    return await call(new Request('http://localhost/api/ratings/movie/424', {
      method,
      headers: { cookie, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }))
  }

  it('gET returns the signed-in caller rating label, or null when absent', async () => {
    const fixture = await createSessionFixture(db)
    expect(await (await ratedCall('GET', fixture.cookie)).json()).toEqual({ label: null })

    await ratedCall('PUT', fixture.cookie, { label: 'GOOD' })

    expect(await (await ratedCall('GET', fixture.cookie)).json()).toEqual({ label: 'GOOD' })
  })

  it('pUT persists a rating and re-rating updates the single row in place', async () => {
    const fixture = await createSessionFixture(db)

    const created = await ratedCall('PUT', fixture.cookie, { label: 'GOOD' })
    expect(created.status).toBe(200)
    expect(await created.json()).toEqual({ label: 'GOOD' })

    const updated = await ratedCall('PUT', fixture.cookie, { label: 'AWESOME' })
    expect(await updated.json()).toEqual({ label: 'AWESOME' })

    const rows = await findRatings(db, fixture.userId)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'MOVIE', tmdbId: 424, label: 'AWESOME' })
  })

  it('dELETE removes the caller rating and reports label null', async () => {
    const fixture = await createSessionFixture(db)
    await ratedCall('PUT', fixture.cookie, { label: 'GOOD' })

    const deleted = await ratedCall('DELETE', fixture.cookie)

    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({ label: null })
    expect(await (await ratedCall('GET', fixture.cookie)).json()).toEqual({ label: null })
  })

  it('rejects anonymous requests with 401 on every verb', async () => {
    const anonymous = new Request('http://localhost/api/ratings/movie/424')

    expect((await call(anonymous)).status).toBe(401)
    expect((await call(new Request('http://localhost/api/ratings/movie/424', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'GOOD' }) }))).status).toBe(401)
    expect((await call(new Request('http://localhost/api/ratings/movie/424', { method: 'DELETE' }))).status).toBe(401)
  })

  it('rejects an invalid label with 400 { issues } and writes nothing', async () => {
    const fixture = await createSessionFixture(db)

    const response = await ratedCall('PUT', fixture.cookie, { label: 'MEH' })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      issues: {
        formErrors: [],
        fieldErrors: { label: ['Invalid option: expected one of "AWESOME"|"GOOD"|"SUCKS"'] },
      },
    })
    expect(await findRatings(db, fixture.userId)).toEqual([])
  })

  it('keeps one user ratings invisible and unwritable by another', async () => {
    const userA = await createSessionFixture(db)
    const userB = await createSessionFixture(db)
    await ratedCall('PUT', userA.cookie, { label: 'AWESOME' })

    expect(await (await ratedCall('GET', userB.cookie)).json()).toEqual({ label: null })

    await ratedCall('PUT', userB.cookie, { label: 'SUCKS' })
    expect(await (await ratedCall('GET', userA.cookie)).json()).toEqual({ label: 'AWESOME' })
    expect(await (await ratedCall('GET', userB.cookie)).json()).toEqual({ label: 'SUCKS' })

    await ratedCall('DELETE', userB.cookie)
    expect(await (await ratedCall('GET', userA.cookie)).json()).toEqual({ label: 'AWESOME' })
    expect(await (await ratedCall('GET', userB.cookie)).json()).toEqual({ label: null })
  })
})

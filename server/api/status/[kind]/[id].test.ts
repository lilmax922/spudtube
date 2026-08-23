import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createApp, createRouter, toWebHandler } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getDb } from '../../../db'
import { findTitleStatus } from '../../../db/queries/title-status'
import { titleStatus, user } from '../../../db/schema'
import { createSessionFixture } from '../../../utils/auth-fixture'
import statusDelete from './[id].delete'
import statusGet from './[id].get'
import statusPut from './[id].put'

const db = getDb()

beforeAll(async () => {
  await migrate(db, { migrationsFolder: resolve('server/db/migrations') })
})

beforeEach(async () => {
  await db.execute(sql`TRUNCATE ${user}, ${titleStatus} CASCADE`)
})

afterAll(async () => {
  await db.$client.end()
})

describe('status routes (seam S2)', () => {
  const router = createRouter()
  router.get('/api/status/:kind/:id', statusGet)
  router.put('/api/status/:kind/:id', statusPut)
  router.delete('/api/status/:kind/:id', statusDelete)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  async function statusCall(method: 'GET' | 'PUT' | 'DELETE', cookie: string, body?: unknown): Promise<Response> {
    return await call(new Request('http://localhost/api/status/movie/424', {
      method,
      headers: { cookie, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }))
  }

  it('gET returns the signed-in caller status, or null when absent', async () => {
    const fixture = await createSessionFixture(db)
    expect(await (await statusCall('GET', fixture.cookie)).json()).toEqual({ status: null })

    await statusCall('PUT', fixture.cookie, { status: 'WATCHLISTED' })

    expect(await (await statusCall('GET', fixture.cookie)).json()).toEqual({ status: 'WATCHLISTED' })
  })

  it('pUT persists a status and the state machine holds: WATCHED overwrites WATCHLISTED, re-watchlisting moves back', async () => {
    const fixture = await createSessionFixture(db)

    const created = await statusCall('PUT', fixture.cookie, { status: 'WATCHLISTED' })
    expect(created.status).toBe(200)
    expect(await created.json()).toEqual({ status: 'WATCHLISTED' })

    const watched = await statusCall('PUT', fixture.cookie, { status: 'WATCHED' })
    expect(await watched.json()).toEqual({ status: 'WATCHED' })

    let row = await findTitleStatus(db, fixture.userId, 'MOVIE', 424)
    expect(row).toMatchObject({ kind: 'MOVIE', tmdbId: 424, status: 'WATCHED' })

    const back = await statusCall('PUT', fixture.cookie, { status: 'WATCHLISTED' })
    expect(await back.json()).toEqual({ status: 'WATCHLISTED' })
    row = await findTitleStatus(db, fixture.userId, 'MOVIE', 424)
    expect(row?.status).toBe('WATCHLISTED')
    expect(await db.select().from(titleStatus).where(sql`1=1`)).toHaveLength(1)
  })

  it('dELETE clears to null and keeps the row', async () => {
    const fixture = await createSessionFixture(db)
    await statusCall('PUT', fixture.cookie, { status: 'WATCHED' })

    const deleted = await statusCall('DELETE', fixture.cookie)

    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({ status: null })
    expect(await (await statusCall('GET', fixture.cookie)).json()).toEqual({ status: null })
    const rows = await db.select().from(titleStatus)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBeNull()
  })

  it('rejects anonymous requests with 401 on every verb', async () => {
    const anonymous = new Request('http://localhost/api/status/movie/424')

    expect((await call(anonymous)).status).toBe(401)
    expect((await call(new Request('http://localhost/api/status/movie/424', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'WATCHLISTED' }) }))).status).toBe(401)
    expect((await call(new Request('http://localhost/api/status/movie/424', { method: 'DELETE' }))).status).toBe(401)
  })

  it('rejects an invalid status with 400 { issues } and writes nothing', async () => {
    const fixture = await createSessionFixture(db)

    const response = await statusCall('PUT', fixture.cookie, { status: 'MAYBE' })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      issues: {
        formErrors: [],
        fieldErrors: { status: ['Invalid option: expected one of "WATCHLISTED"|"WATCHED"'] },
      },
    })
    expect(await findTitleStatus(db, fixture.userId, 'MOVIE', 424)).toBeUndefined()
  })

  it('rejects an invalid payload shape with 400 { issues } before any business logic', async () => {
    const fixture = await createSessionFixture(db)

    const response = await statusCall('PUT', fixture.cookie, { nope: true })

    expect(response.status).toBe(400)
    expect(await findTitleStatus(db, fixture.userId, 'MOVIE', 424)).toBeUndefined()
  })

  it('keeps one user statuses invisible and unwritable by another', async () => {
    const userA = await createSessionFixture(db)
    const userB = await createSessionFixture(db)
    await statusCall('PUT', userA.cookie, { status: 'WATCHLISTED' })

    expect(await (await statusCall('GET', userB.cookie)).json()).toEqual({ status: null })

    await statusCall('PUT', userB.cookie, { status: 'WATCHED' })
    expect(await (await statusCall('GET', userA.cookie)).json()).toEqual({ status: 'WATCHLISTED' })
    expect(await (await statusCall('GET', userB.cookie)).json()).toEqual({ status: 'WATCHED' })

    await statusCall('DELETE', userB.cookie)
    expect(await (await statusCall('GET', userA.cookie)).json()).toEqual({ status: 'WATCHLISTED' })
    expect(await (await statusCall('GET', userB.cookie)).json()).toEqual({ status: null })
  })
})

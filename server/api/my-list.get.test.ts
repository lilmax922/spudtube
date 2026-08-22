import type { TitleDetail } from '../tmdb/types'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createApp, createRouter, toWebHandler } from 'h3'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDb } from '../db'
import { upsertRating } from '../db/queries/rating'
import { upsertTitleStatus } from '../db/queries/title-status'
import { rating, titleStatus, user } from '../db/schema'
import { createSessionFixture } from '../utils/auth-fixture'
import myListHandler from './my-list.get'

const fakeClient = vi.hoisted(() => ({
  title: vi.fn(),
}))

vi.mock('../tmdb/client', () => ({
  getTmdbClient: () => fakeClient,
}))

const db = getDb()

beforeAll(async () => {
  await migrate(db, { migrationsFolder: resolve('server/db/migrations') })
})

beforeEach(async () => {
  await db.execute(sql`TRUNCATE ${user}, ${titleStatus}, ${rating} CASCADE`)
})

afterEach(() => {
  fakeClient.title.mockReset()
})

afterAll(async () => {
  await db.$client.end()
})

describe('gET /api/my-list (seam S2)', () => {
  const router = createRouter()
  router.get('/api/my-list', myListHandler)
  const app = createApp()
  app.use(router)
  const call = toWebHandler(app)

  function detail(kind: 'MOVIE' | 'TV_SHOW', tmdbId: number, name: string): TitleDetail {
    return {
      kind,
      tmdbId,
      name,
      posterPath: `/poster-${tmdbId}.jpg`,
      backdropPath: null,
      releaseDate: '2021-10-22',
      voteAverage: 7.8,
      overview: `Overview of ${name}`,
      tagline: null,
      genres: [],
      runtimeMinutes: 120,
      trailerKey: null,
    }
  }

  it('groups stored references into the three tabs joined with live details, fetched once per unique title', async () => {
    const fixture = await createSessionFixture(db)
    await upsertTitleStatus(db, fixture.userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })
    await upsertTitleStatus(db, fixture.userId, { kind: 'TV_SHOW', tmdbId: 1399, status: 'WATCHED' })
    await upsertRating(db, fixture.userId, { kind: 'MOVIE', tmdbId: 424, label: 'GOOD' })
    await upsertRating(db, fixture.userId, { kind: 'MOVIE', tmdbId: 500, label: 'AWESOME' })
    fakeClient.title.mockImplementation(async (kind: 'MOVIE' | 'TV_SHOW', tmdbId: number) =>
      detail(kind, tmdbId, `Title ${tmdbId}`))

    const response = await call(new Request('http://localhost/api/my-list', {
      headers: { cookie: fixture.cookie },
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.watchlist).toEqual([{
      kind: 'MOVIE',
      tmdbId: 424,
      title: { kind: 'MOVIE', tmdbId: 424, name: 'Title 424', posterPath: '/poster-424.jpg', backdropPath: null, releaseDate: '2021-10-22', voteAverage: 7.8 },
    }])
    expect(body.watched).toEqual([{
      kind: 'TV_SHOW',
      tmdbId: 1399,
      title: { kind: 'TV_SHOW', tmdbId: 1399, name: 'Title 1399', posterPath: '/poster-1399.jpg', backdropPath: null, releaseDate: '2021-10-22', voteAverage: 7.8 },
    }])
    const ratedKeys = body.rated.map((entry: { kind: string, tmdbId: number }) => `${entry.kind}:${entry.tmdbId}`)
    expect(ratedKeys.sort()).toEqual(['MOVIE:424', 'MOVIE:500'])
    expect(fakeClient.title).toHaveBeenCalledTimes(3)
    expect(fakeClient.title).toHaveBeenCalledWith('MOVIE', 424)
    expect(fakeClient.title).toHaveBeenCalledWith('TV_SHOW', 1399)
    expect(fakeClient.title).toHaveBeenCalledWith('MOVIE', 500)
  })

  it('renders a removed reference as a degraded null title without breaking the rest', async () => {
    const fixture = await createSessionFixture(db)
    await upsertTitleStatus(db, fixture.userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })
    await upsertTitleStatus(db, fixture.userId, { kind: 'MOVIE', tmdbId: 999, status: 'WATCHED' })
    fakeClient.title.mockImplementation(async (kind: 'MOVIE' | 'TV_SHOW', tmdbId: number) =>
      tmdbId === 999 ? null : detail(kind, tmdbId, `Title ${tmdbId}`))

    const response = await call(new Request('http://localhost/api/my-list', {
      headers: { cookie: fixture.cookie },
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.watchlist[0].title.name).toBe('Title 424')
    expect(body.watched).toEqual([{ kind: 'MOVIE', tmdbId: 999, title: null }])
  })

  it('degrades a failing TMDB fetch to null instead of failing the whole list', async () => {
    const fixture = await createSessionFixture(db)
    await upsertTitleStatus(db, fixture.userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })
    await upsertTitleStatus(db, fixture.userId, { kind: 'MOVIE', tmdbId: 999, status: 'WATCHED' })
    fakeClient.title.mockImplementation(async (kind: 'MOVIE' | 'TV_SHOW', tmdbId: number) => {
      if (tmdbId === 999)
        throw new Error('upstream timeout')
      return detail(kind, tmdbId, `Title ${tmdbId}`)
    })

    const response = await call(new Request('http://localhost/api/my-list', {
      headers: { cookie: fixture.cookie },
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.watchlist[0].title.name).toBe('Title 424')
    expect(body.watched).toEqual([{ kind: 'MOVIE', tmdbId: 999, title: null }])
  })

  it('keeps another user lists empty and invisible', async () => {
    const userA = await createSessionFixture(db)
    const userB = await createSessionFixture(db)
    await upsertTitleStatus(db, userA.userId, { kind: 'MOVIE', tmdbId: 424, status: 'WATCHLISTED' })
    fakeClient.title.mockResolvedValue(detail('MOVIE', 424, 'Title 424'))

    const response = await call(new Request('http://localhost/api/my-list', {
      headers: { cookie: userB.cookie },
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ watchlist: [], watched: [], rated: [] })
    expect(fakeClient.title).not.toHaveBeenCalled()
  })

  it('rejects anonymous requests with 401', async () => {
    const response = await call(new Request('http://localhost/api/my-list'))

    expect(response.status).toBe(401)
    expect(fakeClient.title).not.toHaveBeenCalled()
  })
})

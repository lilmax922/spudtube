import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { createApp, defineEventHandler, toWebHandler } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import authHandler from '../api/auth/[...all]'
import { auth } from '../auth'
import { getDb } from '../db'
import { account, session, user, verification } from '../db/schema'
import { getAuthSession, requireAuthSession } from './auth'
import { createSessionFixture } from './auth-fixture'

const db = getDb()

beforeAll(async () => {
  await migrate(db, { migrationsFolder: resolve('server/db/migrations') })
})

beforeEach(async () => {
  await db.execute(sql`TRUNCATE ${verification}, ${account}, ${session}, ${user} CASCADE`)
})

afterAll(async () => {
  await db.$client.end()
})

function guardApp() {
  const app = createApp()
  app.use('/api/me', defineEventHandler(async (event) => {
    const authSession = await requireAuthSession(event)
    return { email: authSession.user.email }
  }))
  return toWebHandler(app)
}

describe('session guard (seam S2)', () => {
  it('rejects anonymous requests with 401', async () => {
    const fetchGuard = guardApp()

    const response = await fetchGuard(new Request('http://localhost/api/me', { method: 'POST' }))

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ statusCode: 401, statusMessage: 'Unauthorized' })
  })

  it('returns the session for a real fixture session cookie', async () => {
    const fixture = await createSessionFixture(db)
    const fetchGuard = guardApp()

    const response = await fetchGuard(new Request('http://localhost/api/me', {
      method: 'POST',
      headers: { cookie: fixture.cookie },
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ email: expect.stringMatching(/@example\.com$/) })
  })

  it('getAuthSession returns null for anonymous headers', async () => {
    const app = createApp()
    app.use('/api/anon', defineEventHandler(async event => ({
      signedIn: (await getAuthSession(event)) !== null,
    })))
    const fetchAnon = toWebHandler(app)

    const response = await fetchAnon(new Request('http://localhost/api/anon'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ signedIn: false })
  })

  it('sign-out clears the session so getSession no longer recognizes it', async () => {
    const fixture = await createSessionFixture(db)
    const app = createApp()
    app.use('/api/auth', authHandler)
    const fetchAuth = toWebHandler(app)

    const signOutResponse = await fetchAuth(new Request('http://localhost/api/auth/sign-out', {
      method: 'POST',
      headers: { cookie: fixture.cookie },
    }))
    expect(signOutResponse.status).toBe(200)

    const sessionAfter = await auth.api.getSession({ headers: new Headers({ cookie: fixture.cookie }) })
    expect(sessionAfter).toBeNull()
  })
})

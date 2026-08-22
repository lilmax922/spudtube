import type { Db } from '../db'
import { createHmac } from 'node:crypto'
import { session, user } from '../db/schema'

// S2 fixture seam: create a real user + session row through Drizzle and present the
// genuine session cookie so Better Auth accepts it — no hand-rolled tokens, no mocks.
// The cookie value is the raw session token signed with the same HMAC-SHA-256 scheme
// Better Auth's `serializeSignedCookie` uses, keyed by BETTER_AUTH_SECRET.

const SESSION_COOKIE_NAME = 'better-auth.session_token'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function signSessionToken(token: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  return encodeURIComponent(`${token}.${signature}`)
}

export interface SessionFixture {
  userId: string
  cookie: string
  token: string
}

export async function createSessionFixture(db: Db, secret: string, options: { email?: string } = {}): Promise<SessionFixture> {
  const userId = crypto.randomUUID()
  const email = options.email ?? `${userId}@example.com`
  await db.insert(user).values({ id: userId, name: 'Spud Tester', email, emailVerified: true })
  const token = crypto.randomUUID().replaceAll('-', '').slice(0, 32)
  await db.insert(session).values({
    id: crypto.randomUUID(),
    userId,
    token,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  })
  return {
    userId,
    token,
    cookie: `${SESSION_COOKIE_NAME}=${signSessionToken(token, secret)}`,
  }
}

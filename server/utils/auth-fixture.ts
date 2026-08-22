import type { Db } from '../db'
import { createHmac } from 'node:crypto'
import process from 'node:process'
import { auth } from '../auth'
import { user } from '../db/schema'

// S2 fixture seam: create a real user through Drizzle and a real session through Better
// Auth's own programmatic API (`internalAdapter.createSession` — same path sign-in uses),
// then present the genuine session cookie. No hand-rolled tokens, no auth-layer mocks.
// The only replicated piece is the cookie wire format: `<token>.<HMAC-SHA-256 base64>`
// under the session cookie name, signed with BETTER_AUTH_SECRET exactly as Better Auth's
// `serializeSignedCookie` does. getSession validates the cookie against the DB row.

const SESSION_COOKIE_NAME = 'better-auth.session_token'

function signSessionToken(token: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  return encodeURIComponent(`${token}.${signature}`)
}

export interface SessionFixture {
  userId: string
  cookie: string
}

export async function createSessionFixture(db: Db, options: { email?: string } = {}): Promise<SessionFixture> {
  const userId = crypto.randomUUID()
  const email = options.email ?? `${userId}@example.com`
  await db.insert(user).values({ id: userId, name: 'Spud Tester', email, emailVerified: true })

  const internalAdapter = (await auth.$context).internalAdapter
  const session = await internalAdapter.createSession(userId)
  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  return {
    userId,
    cookie: `${SESSION_COOKIE_NAME}=${signSessionToken(session.token, secret)}`,
  }
}

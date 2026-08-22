import type { H3Event } from 'h3'
import { createError } from 'h3'
import { auth } from '../auth'

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export async function getAuthSession(event: H3Event): Promise<AuthSession | null> {
  return await auth.api.getSession({ headers: event.headers })
}

// The single guard for mutating endpoints: every write route calls this first and
// rejects anonymous requests with 401 before any business logic runs.
export async function requireAuthSession(event: H3Event): Promise<AuthSession> {
  const session = await getAuthSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session
}

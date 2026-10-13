import type { H3Event } from 'h3'
import process from 'node:process'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth/minimal'
import { getDb, getHyperdriveConnectionString } from './db'
import * as authSchema from './db/schema/auth'

type AuthInstance = ReturnType<typeof betterAuth>

function createAuthInstance(event?: H3Event): AuthInstance {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    trustHost: true,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(event), { provider: 'pg', schema: authSchema }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
  } as Parameters<typeof betterAuth>[0]) as AuthInstance
}

let singletonAuth: AuthInstance | undefined

function getSingletonAuth(): AuthInstance {
  singletonAuth ??= createAuthInstance()
  return singletonAuth
}

// Request-scoped Better Auth instance. On Cloudflare Pages/Workers the production DB is
// reached through a Hyperdrive binding (ADR 0002); the binding is available per request
// on `event.context.cloudflare.env.HYPERDRIVE`. When that binding exists we build a fresh
// instance backed by the Hyperdrive Pool so each request uses the platform-managed
// connection; otherwise we reuse the local singleton that points at DATABASE_URL. Callers
// that do not have an event (CLI, tests, fixtures) fall through to the singleton.
export function getAuth(event?: H3Event): AuthInstance {
  if (event && getHyperdriveConnectionString(event)) {
    return createAuthInstance(event)
  }
  return getSingletonAuth()
}

// Back-compat: existing imports `import { auth } from '../auth'` keep working. The proxy
// defers singleton creation until first property access so importing this module alone never
// opens a DB socket or requires DATABASE_URL (important when the only DB in production is
// the Hyperdrive binding and no DATABASE_URL env var is set).
export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  get(_target, prop) {
    const instance = getSingletonAuth()
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value
  },
})

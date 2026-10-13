import type { H3Event } from 'h3'
import process from 'node:process'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth/minimal'
import { getDb, getHyperdriveConnectionString } from './db'
import * as authSchema from './db/schema/auth'

type AuthInstance = ReturnType<typeof betterAuth>

interface AuthEnv {
  BETTER_AUTH_URL?: string
  BETTER_AUTH_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

function getCloudflareEnv(event?: H3Event): AuthEnv | undefined {
  const env = (event as unknown as { context?: { cloudflare?: { env?: AuthEnv } } })?.context?.cloudflare?.env
  return env ?? undefined
}

function resolveAuthValue(event: H3Event | undefined, key: keyof AuthEnv): string | undefined {
  const fromBinding = getCloudflareEnv(event)?.[key]
  if (typeof fromBinding === 'string' && fromBinding.length > 0)
    return fromBinding
  const fromProcess = process.env[key]
  if (typeof fromProcess === 'string' && fromProcess.length > 0)
    return fromProcess
  return undefined
}

export function resolveAuthEnv(event?: H3Event): AuthEnv {
  return {
    BETTER_AUTH_URL: resolveAuthValue(event, 'BETTER_AUTH_URL'),
    BETTER_AUTH_SECRET: resolveAuthValue(event, 'BETTER_AUTH_SECRET'),
    GOOGLE_CLIENT_ID: resolveAuthValue(event, 'GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: resolveAuthValue(event, 'GOOGLE_CLIENT_SECRET'),
  }
}

function hasCloudflareEnv(event?: H3Event): boolean {
  return getCloudflareEnv(event) !== undefined
}

function createAuthInstance(event?: H3Event): AuthInstance {
  const authEnv = resolveAuthEnv(event)
  return betterAuth({
    baseURL: authEnv.BETTER_AUTH_URL,
    trustHost: true,
    secret: authEnv.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(event), { provider: 'pg', schema: authSchema }),
    socialProviders: {
      google: {
        clientId: authEnv.GOOGLE_CLIENT_ID ?? '',
        clientSecret: authEnv.GOOGLE_CLIENT_SECRET ?? '',
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
// reached through a Hyperdrive binding (ADR 0002) and the auth secrets live in the same
// platform env (`event.context.cloudflare.env`); both are only available per request.
// When that env exists we build a fresh instance so each request uses the platform-managed
// connection and the request-scoped secrets; otherwise we reuse the local singleton that
// points at DATABASE_URL/process.env. Callers without an event (CLI, tests, fixtures)
// fall through to the singleton.
export function getAuth(event?: H3Event): AuthInstance {
  if (event && (getHyperdriveConnectionString(event) || hasCloudflareEnv(event))) {
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

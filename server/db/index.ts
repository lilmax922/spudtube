import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { H3Event } from 'h3'
import process from 'node:process'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema> & { $client: Pool }

export interface Hyperdrive {
  connectionString: string
}

export function createDb(databaseUrl: string): Db {
  return drizzle(new Pool({ connectionString: databaseUrl }), { casing: 'snake_case', schema })
}

let db: Db | undefined

export function getHyperdriveConnectionString(event?: H3Event | unknown): string | undefined {
  const cloudflare = (event as { context?: { cloudflare?: { env?: Record<string, unknown>, HYPERDRIVE?: unknown } } })?.context?.cloudflare
  const env = (cloudflare as { env?: Record<string, unknown> })?.env ?? (cloudflare as Record<string, unknown> | undefined)
  const hyperdrive = (env as Record<string, unknown> | undefined)?.HYPERDRIVE as Hyperdrive | undefined
  if (hyperdrive && typeof hyperdrive.connectionString === 'string' && hyperdrive.connectionString.length > 0) {
    return hyperdrive.connectionString
  }
  return undefined
}

export function resolveDatabaseUrl(event?: H3Event | unknown): string {
  const hyperdriveUrl = getHyperdriveConnectionString(event)
  if (hyperdriveUrl) {
    return hyperdriveUrl
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  return databaseUrl
}

// The app-wide connection, lazily created. In production on Cloudflare Workers/Pages the
// Supabase transaction pooler is reached through a Hyperdrive binding (ADR 0002/0003):
// `event.context.cloudflare.env.HYPERDRIVE.connectionString` takes precedence over the
// local `DATABASE_URL` env var. When a Hyperdrive connection is used the Pool is created
// per request so the binding's internal pooling/caching applies; the local path keeps a
// singleton for efficiency and test isolation.
export function getDb(event?: H3Event | unknown): Db {
  const hyperdriveUrl = getHyperdriveConnectionString(event)
  if (hyperdriveUrl) {
    return createDb(hyperdriveUrl)
  }
  if (!db) {
    const databaseUrl = resolveDatabaseUrl(event)
    db = createDb(databaseUrl)
  }
  return db
}

// Test-only helper to reset the singleton between tests that mutate process.env.DATABASE_URL.
export function __resetDbSingleton(): void {
  db = undefined
}

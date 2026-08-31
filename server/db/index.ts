import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { H3Event } from 'h3'
import process from 'node:process'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema> & { $client: Pool }

export function createDb(databaseUrl: string, options?: { max?: number }): Db {
  return drizzle(new Pool({
    connectionString: databaseUrl,
    max: options?.max,
    // Fail fast instead of hanging the request for the platform timeout. A pooler that
    // accepts a write but silently swallows the reply (the misconfigured transaction-mode
    // pooler incident) otherwise leaves the Worker awaiting the query forever, Cloudflare
    // cancels it, and the client gets an empty 500 with no error to root-cause from.
    connectionTimeoutMillis: 10_000,
    query_timeout: 15_000,
  }), { casing: 'snake_case', schema })
}

let localDb: Db | undefined

export function getHyperdriveConnectionString(event?: H3Event | unknown): string | undefined {
  const connectionString = (event as unknown as { context?: { cloudflare?: { env?: { HYPERDRIVE?: { connectionString?: unknown } } } } })?.context?.cloudflare?.env?.HYPERDRIVE?.connectionString
  if (typeof connectionString === 'string' && connectionString.length > 0) {
    return connectionString
  }
  return undefined
}

export function resolveDatabaseUrl(event?: H3Event | unknown): string {
  const hyperdriveUrl = event ? getHyperdriveConnectionString(event as H3Event) : undefined
  if (hyperdriveUrl) {
    return hyperdriveUrl
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  return databaseUrl
}

export function getDb(event?: H3Event | unknown): Db {
  if (event) {
    const hyperdriveUrl = getHyperdriveConnectionString(event)
    if (hyperdriveUrl) {
      // Per-request Pool for Hyperdrive — respects Workers connection limit.
      // Hyperdrive manages the underlying TCP pool; a Pool per request (max 5)
      // is the recommended pattern for Drizzle + pg on Workers (see hyperdrive docs).
      // The runtime reclaims the Pool after the request; no explicit waitUntil needed
      // for Pool (unlike Client). For Client you'd call `ctx.waitUntil(client.end())`.
      return createDb(hyperdriveUrl, { max: 5 })
    }
  }
  if (!localDb) {
    const databaseUrl = event
      ? resolveDatabaseUrl(event)
      : (() => {
          const url = process.env.DATABASE_URL
          if (!url)
            throw new Error('DATABASE_URL is required')
          return url
        })()
    localDb = createDb(databaseUrl)
  }
  return localDb
}

// Test-only helper to reset the singleton between tests that mutate process.env.DATABASE_URL.
export function __resetDbSingleton(): void {
  localDb = undefined
}

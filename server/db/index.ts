import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import process from 'node:process'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema> & { $client: Pool }

export function createDb(databaseUrl: string): Db {
  return drizzle(new Pool({ connectionString: databaseUrl }), { casing: 'snake_case', schema })
}

let db: Db | undefined

// The one app-wide connection, created lazily so importing this module alone (e.g. in
// pure-query unit tests) never opens a socket. Better Auth's adapter and routes share it.
export function getDb(): Db {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required')
    }
    db = createDb(databaseUrl)
  }
  return db
}

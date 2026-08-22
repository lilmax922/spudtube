import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema> & { $client: Pool }

export function createDb(databaseUrl: string): Db {
  return drizzle(new Pool({ connectionString: databaseUrl }), { casing: 'snake_case', schema })
}

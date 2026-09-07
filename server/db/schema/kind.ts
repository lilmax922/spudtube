import { pgEnum } from 'drizzle-orm/pg-core'
import { KINDS } from '../../../shared/kind/kind'

// Canonical Title kind (CONTEXT.md). TMDB's movie/tv vocabulary maps onto this once, at the TMDB boundary.
// The value list lives in shared so both sides name one type; this table only adds the Postgres enum.
export const kindEnum = pgEnum('kind', [...KINDS])

export type { Kind } from '../../../shared/kind/kind'

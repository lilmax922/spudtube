import { pgEnum } from 'drizzle-orm/pg-core'

// Canonical Title kind (CONTEXT.md). TMDB's movie/tv vocabulary maps onto this once, at the TMDB boundary.
export const kindEnum = pgEnum('kind', ['MOVIE', 'TV_SHOW'])

export type Kind = (typeof kindEnum.enumValues)[number]

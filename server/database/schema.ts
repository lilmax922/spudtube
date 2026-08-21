import { pgEnum } from 'drizzle-orm/pg-core'

// Kind of a Title (CONTEXT.md): exactly one of MOVIE | TV_SHOW.
// Consumed by rating and title_status primary keys in tickets 09–10.
export const kindEnum = pgEnum('kind', ['MOVIE', 'TV_SHOW'])

# 14: Data-layer foundation (ADR 0004)

**What to build:** The shared groundwork every persisted-feature slice builds on — no user-facing behaviour of its own, which is exactly why it lands first: database artifacts regrouped under the server db layout (schema / queries / migrations folders plus an index barrel) replacing the scaffold's provisional location, with the existing Kind enum carried over without breaking applied migration history; schema modules that colocate each table with its relations, derived Zod schema variants (`Schema`-suffixed constants) and row types, refined where defined and never composed inline in routes, reached from app code only through Nuxt's built-in `#server` alias; and the one shared HTTP 400 `{ issues }` validation-error helper (built on `z.flattenError`) with its shared error type. Tickets 09 and 10 consume this directly, which is why they are blocked by this ticket.

**Blocked by:** 01.

**Status:** ready-for-human

- [x] All db artifacts live in the server db layout with a re-exporting barrel; the provisional scaffold location is gone; typecheck / lint / build / test all green
- [x] Kind enum sits in a colocated schema module and the existing migration journal still applies cleanly
- [x] The colocation pattern is established by example: one table module exporting table, relations, Insert/Select/Update schema constants and row types together
- [x] App code imports schemas and types only through the `#server` alias pointing at the barrel
- [x] Any Zod parse failure inside a route returns 400 `{ issues }` through the single shared helper, proven by a route-tier test
- [x] Query-function conventions demonstrated: verb-first names, validated payloads plus explicit identity arguments, user-id scoping, results returned via returning

## Comments

Implemented on the current branch. Summary of decisions:

- **Layout**: `server/database/**` → `server/db/**` — `index.ts` (client factory, `casing: 'snake_case'`), `schema/` (one module per table + `index.ts` barrel), `queries/rating.ts`, `migrations/` moved verbatim (`git mv`; journal tags are folder-relative so applied history is untouched — verified incrementally against the live DB whose `0000` row predates the move, and from scratch on a throwaway database).
- **drizzle-zod**: ADR names `drizzle-orm/zod`, but stable drizzle-orm (0.45.2) doesn't ship that subpath yet (zod generation moves into core only in the 1.x beta line). Used the official companion package `drizzle-zod@0.8` + `zod@4` — same API (`createInsertSchema` / `createSelectSchema` / `createUpdateSchema`, `.omit()`, definition-site refinements), documented at orm.drizzle.team/docs/zod.
- **Exemplar table = `rating`** (first consumer, ticket 09): colocates `ratingLabelEnum`, table (composite PK `(user_id, kind, tmdb_id)` per spec), `ratingRelations`, `InsertRatingSchema` / `SelectRatingSchema` / `UpdateRatingSchema` (refined where defined: positive-int `tmdbId`; identity + timestamps omitted), and row types `Rating` / `InsertRating`. Note: drizzle tables have no `$inferUpdate`, so there is no Update row type — the update variant exists as a schema constant only.
- **`user` table added early**: Better Auth's core user model (id/name/email/emailVerified/image/timestamps) hand-declared in `schema/user.ts`, deliberately outside the Zod pipeline per ADR 0004. Needed now so `rating.user_id` carries a real cascade FK from migration 0001 and `ratingRelations` can demonstrate a real relation; ticket 08 binds Better Auth's drizzle adapter onto it.
- **Error contract**: `server/utils/api-validation.ts` exports `ApiValidationError` plus `sendApiValidationError(event, error)` — sets HTTP 400 and returns `{ issues: z.flattenError(error) }`. Proven at route tier through h3's `createApp` + `toWebHandler` with a real POST cycle (invalid → exact `{ issues }` body; valid → untouched).
- **`#server` crossing proven from app code**: `app/server-schema.test.ts` imports `InsertRatingSchema` / `SelectRatingSchema` / types through `#server/db/schema` under the Nuxt vitest environment — validates and rejects payloads client-side, same objects the server parses with.
- **Query conventions demonstrated** (`findRating`, `findRatings`, `upsertRating`, `deleteRating`): verb-first camelCase, `(db, userId, …)` signatures with validated payload types derived from the schema constants, every statement scoped by `userId`, writes returned via `.returning()` (delete returns the removed row or undefined). Integration-tested against Docker Postgres, including re-rate-in-place via composite-PK upsert and cross-user scoping.

Verification evidence: `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0; full suite 5 files / 12 tests green (route-tier 400 contract, query integration tier incl. migrations applied programmatically, happy-dom `#server` crossing).

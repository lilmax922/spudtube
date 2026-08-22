# Data layer: colocated Drizzle schemas with derived Zod

Drizzle table definitions are the single source of truth for data shapes. Every DB-related artifact lives under `server/db/`: one file per domain table in `server/db/schema/` containing the table, its relations, Zod schemas derived via the `drizzle-zod` companion package (`createInsertSchema`, refined and `.omit()`-ed at the definition site — routes never compose schemas inline), and the exported row types; alongside `server/db/index.ts` (drizzle client, casing snake_case), generated migrations, and one queries file per table. Query functions accept already-validated payloads plus explicit identity arguments, always scope by `userId`, and return rows via `.returning()`. Client forms validate through vee-validate + zodResolver against the exact same schema objects the server parses with; app code imports schemas and types through Nuxt's built-in `#server` alias (`#server/db/schema`, where an `index.ts` barrel re-exports every table module) — making this the only sanctioned crossing of the server boundary (safe because pg-core is dependency-free builder code). Canonical enums (`Kind`, `Rating`, `WatchStatus`) are Postgres enums storing the canonical labels from CONTEXT.md verbatim; TMDB's vocabulary (`movie`/`tv`) is mapped once at the boundary. Hand-written Zod schemas for TMDB payloads stay server-only (`server/utils/tmdb/schemas.ts`); raw shapes never reach the client. Validation failures return HTTP 400 with `{ issues }` from `z.flattenError` through one shared helper typed by a shared `ApiValidationError`. Better Auth tables stay outside this pipeline entirely. Naming: schema constants and types are PascalCase — schemas carry a `Schema` suffix (`InsertRatingSchema`), row types don't (`InsertRating`); query functions are verb-first camelCase (`findRatings`, `insertRating`).

## Considered Options

- **Hand-written Zod as contract truth** (rejected): fights drizzle-zod's grain; every column change updated in two places.
- **Per-endpoint route-level schema composition** (rejected): over-engineering for v1's simple endpoints; variants are named exports in the schema file instead.
- **Derived schemas in Nuxt's `shared/` directory** (rejected): scatters DB files outside the server tree; all DB concerns stay physically inside `server/`.
- **Types-only sharing, no client-side runtime validation** (rejected): would drop live field-level form errors or force a duplicated second set of rules, breaking the same-schemas-everywhere goal.
- **Single `lib/db/` folder as in nuxt-travel-log** (rejected): identical structure, but nothing prevents the pg driver and connection string from reaching the client bundle.

## Consequences

- Column changes propagate to forms, endpoints, and types automatically; no second place to update.
- Table builder code ships in the client bundle (small, dependency-free).
- `server/` is no longer an absolute wall: importing schemas/types via `#server/db/schema` is sanctioned; anything else under `server/` remains off-limits to app code.

## Amendments

2026-08-22: Schema derivation currently imports from the `drizzle-zod` companion package rather than `drizzle-orm/zod`: stable drizzle-orm (0.45.x) has not yet absorbed Zod generation into core (that happens in the 1.0.0-beta.15+ line). Same API surface; revisit when drizzle-orm ships the subpath.

2026-08-22: The Better Auth tables (`user`, `session`, `account`, `verification`) are no longer hand-declared. They now live in `server/db/schema/auth.ts`, generated from the live Better Auth instance by `scripts/generate-auth-schema.mts` (the adapter-bundled generator — the `@better-auth/cli` package lags behind `better-auth` itself). This removes the drift risk on `better-auth` upgrades while keeping the original rationale intact: auth tables still sit outside the derived-Zod pipeline, still live under `server/db/`, and still bind to the adapter explicitly via the `schema` map in `server/auth.ts`. The generator's raw output is post-processed by the script (strip relations block unavailable in drizzle-orm 0.45, `withTimezone: true` timestamps, property-key column names so the global `snake_case` casing applies). Re-run the script after changing auth options or adding plugins.

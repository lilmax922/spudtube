# 08: Google sign-in (Better Auth)

**What to build:** Sign-in with Google as the only provider via Better Auth; session recognized app-wide with sign-out; Better Auth's standard tables migrated into the local Postgres. GCP credentials arrive through env vars, never committed.

**Blocked by:** 01, 02, 11.

**Status:** ready-for-agent

- [x] Full OAuth round trip works locally against Docker Postgres
- [x] Session survives reload; sign-out clears it everywhere in the UI
- [x] Mutating endpoints reject anonymous requests with proper errors (fixture-tested, seam S2)
- [x] Credentials read from env only; no secrets in the repo

## Comments

Implemented on the current branch. Summary of decisions:

- **Stack**: Better Auth 1.7 (`better-auth/minimal` — no email/password, Google-only per spec) with the `@better-auth/drizzle-adapter` bound to the existing app-wide `getDb()` singleton (`server/db/index.ts`). `trustHost: true` + optional `BETTER_AUTH_URL` so the same instance works on localhost and Cloudflare Workers.
- **Schema**: Better Auth's core tables `session` / `account` / `verification` hand-declared in `server/db/schema/` (colocated with relations, outside the derived-Zod pipeline per ADR 0004, matching the pre-existing `user` table). Migration `0002` adds them (snake_case via drizzle casing, `account` unique on `(issuer, account_id)`); applied to Docker Postgres.
- **Mount**: `server/api/auth/[...all].ts` catch-all → `auth.handler(toWebRequest(event))`.
- **Guard (seam S2)**: `server/utils/auth.ts` exports `getAuthSession` and `requireAuthSession` — the single 401 gate every future mutating endpoint calls. Fixture-tested at the route tier against Docker Postgres with **real** user+session rows written via Drizzle and the genuine signed session cookie (`better-auth.session_token` = raw token + HMAC-SHA-256 over `BETTER_AUTH_SECRET`), per S2 ("no hand-rolled tokens, no auth-layer mocks"). `server/utils/auth-fixture.ts` is the reusable fixture for tickets 09/10.
- **Client/UI**: `app/lib/auth-client.ts` (`better-auth/vue` `createAuthClient`); `app/components/account-menu.vue` (props `user`, emits `signIn`/`signOut`, S3-testable) wired into `app/app.vue` through `authClient.useSession(useFetch)` so the session hydrates from SSR and clears everywhere on sign-out. i18n keys `auth.signIn` / `auth.signOut` (zh-TW/en). No emoji; Lucide `LogIn`/`LogOut`, dark-system tokens.
- **Test hardening**: node-project test files now run serially (`fileParallelism: false`) — the auth and rating integration tests share the Docker DB and TRUNCATE CASCADE in `beforeEach`; parallel files were wiping each other's fixtures. `vitest.node.setup.ts` supplies a deterministic fixture secret + `DATABASE_URL` fallback before auth modules load.
- **GCP setup (done via browser)**: new project `spudtube`, Google Auth Platform brand "SpudTube" (External, support + dev contact = owner email, user-data-policy accepted), web OAuth client **`605922363226-secvh4691f0g69frklc7h1phagc87q3u.apps.googleusercontent.com`** with authorized JS origin `http://localhost:3000` and redirect URI `http://localhost:3000/api/auth/callback/google`; owner added as a test user (Testing status). Credentials live in the gitignored `.env` (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`) — `.env.example` documents the keys only.
- **Live verification**: full Google round trip driven in the real browser — sign-in → consent (test user `asd88922@gmail.com`) → callback → `user`/`session`/`account` rows persisted to Docker; reload keeps the session (SSR hydration); sign-out deletes the session row and the header reverts to sign-in.

Verification evidence: `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0; full suite 17 files / 66 tests green, stable across repeated runs.

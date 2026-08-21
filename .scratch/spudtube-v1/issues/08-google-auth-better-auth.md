# 08: Google sign-in (Better Auth)

**What to build:** Sign-in with Google as the only provider via Better Auth; session recognized app-wide with sign-out; Better Auth's standard tables migrated into the local Postgres. GCP credentials arrive through env vars, never committed.

**Blocked by:** 01, 02, 11.

**Status:** ready-for-agent

- [ ] Full OAuth round trip works locally against Docker Postgres
- [ ] Session survives reload; sign-out clears it everywhere in the UI
- [ ] Mutating endpoints reject anonymous requests with proper errors (fixture-tested, seam S2)
- [ ] Credentials read from env only; no secrets in the repo

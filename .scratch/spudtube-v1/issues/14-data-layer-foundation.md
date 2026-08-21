# 14: Data-layer foundation (ADR 0004)

**What to build:** The shared groundwork every persisted-feature slice builds on — no user-facing behaviour of its own, which is exactly why it lands first: database artifacts regrouped under the server db layout (schema / queries / migrations folders plus an index barrel) replacing the scaffold's provisional location, with the existing Kind enum carried over without breaking applied migration history; schema modules that colocate each table with its relations, derived Zod schema variants (`Schema`-suffixed constants) and row types, refined where defined and never composed inline in routes, reached from app code only through Nuxt's built-in `#server` alias; and the one shared HTTP 400 `{ issues }` validation-error helper (built on `z.flattenError`) with its shared error type. Tickets 09 and 10 consume this directly, which is why they are blocked by this ticket.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] All db artifacts live in the server db layout with a re-exporting barrel; the provisional scaffold location is gone; typecheck / lint / build / test all green
- [ ] Kind enum sits in a colocated schema module and the existing migration journal still applies cleanly
- [ ] The colocation pattern is established by example: one table module exporting table, relations, Insert/Select/Update schema constants and row types together
- [ ] App code imports schemas and types only through the `#server` alias pointing at the barrel
- [ ] Any Zod parse failure inside a route returns 400 `{ issues }` through the single shared helper, proven by a route-tier test
- [ ] Query-function conventions demonstrated: verb-first names, validated payloads plus explicit identity arguments, user-id scoping, results returned via returning

# spudtube

Discover movies and TV shows, check streaming availability, and manage your watchlists and ratings. No more "what to watch tonight" fatigue.

## Agent skills

### Issue tracker

Issues live as GitHub Issues on `lilmax922/spudtube`, operated via the `gh-axi` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Implementation rules

Read before implementing or making any architectural decision:

- `docs/agents/code-standard.md` — implementation rules and conventions (Definition of Done, naming, imports, lint/format, testing, git).
- `docs/agents/design-system.md` — approved UI baseline: tokens, type scale, spacing/density, icon stance, and binding rules (no gradients, no emoji, dark-only). Read before any UI work.

## SSR data fetching

- First-paint data (hero, rows, filter metadata) goes through `app/composables/use-ssr-data.ts` (SSR-tracked `useAsyncData` + payload seeding) so server HTML and hydration agree; never fire-and-forget `$fetch` in setup. Composable module singletons are client-only (`import.meta.server` bypass) to avoid cross-request leaks. Reka auto-IDs come from the root `ConfigProvider` counter in `app/app.vue`, never Vue `useId` namespaces.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.

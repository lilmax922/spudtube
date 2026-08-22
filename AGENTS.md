# spudtube

A dummy repo.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Implementation rules

Read before implementing or making any architectural decision:

- `docs/agents/code-standard.md` — implementation rules and conventions (Definition of Done, naming, imports, lint/format, testing, git).
- `docs/agents/design-system.md` — approved UI baseline: tokens, type scale, spacing/density, icon stance, and binding rules (no gradients, no emoji, dark-only). Read before any UI work.

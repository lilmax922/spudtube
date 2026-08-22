# Code Standard

Implementation rules and conventions for this repo. Rationale for architecture and technology choices lives in `docs/adr/`; domain vocabulary lives in `CONTEXT.md`. Consult both before making architectural decisions.

## Definition of Done

A task that modifies code is done only when all three pass, run at task end (scripts defined in `package.json`; if one is renamed there, rename it here in the same commit):

1. `pnpm typecheck`
2. `pnpm lint` (ESLint — also the formatter)
3. `pnpm build`

## Naming

**Files**: kebab-case across the entire codebase (`title-card.vue`, `use-region.ts`, `tmdb-client.ts`). Enforced by lint (`unicorn/filename-case`, kebab).

- **shadcn-vue clause**: the CLI emits PascalCase files into `components/ui/**`. After every `shadcn-vue add <component>`, rename generated files and folders to kebab-case and fix their relative imports (`index.ts` and siblings). Lint failures catch any stragglers; never exempt vendor code from the rule.

**Identifiers**:

| Thing | Case | Example |
| --- | --- | --- |
| variables, functions | camelCase | `fetchAvailability` |
| composables | `use` prefix + camelCase | `useRegion()` |
| types, interfaces, classes | PascalCase | `TitleSummary` |
| components (in-code names) | PascalCase, always multi-word | `TitleCard` |
| module-level constants | UPPER_SNAKE_CASE | `CURATED_REGIONS` |
| env vars | UPPER_SNAKE_CASE | `TMDB_TOKEN` |

**Database**: table names singular + snake_case (`rating`, `title_status`, `user`); column names snake_case (`detected_region`, `tmdb_id`). Foreign keys follow `<referenced_table>_id` (`user_id`).

## Imports

Auto-imports are disabled at all three sites (`imports.autoImport: false`, `components.dirs: []`, `nitro.imports: false`). Every symbol is imported explicitly: framework APIs from `vue`, `#imports`, or their owning package; project modules by relative path. Import order is enforced by lint.

## Lint & Format

`@antfu/eslint-config` wraps the Nuxt ESLint setup in a single flat config. ESLint is the **only** formatter — Prettier is never installed or enabled. Style defaults apply as configured by antfu: single quotes, no semicolons, 2-space indent, dangling commas, sorted imports, interface over type alias. Auto-fix with `pnpm lint --fix`. Editor integration follows antfu's VS Code settings (format-on-save off, `source.fixAll.eslint` explicit).

## TypeScript

`strict: true` always. Explicit return types on exported functions. Types live in `types.ts` files; constants live in `constants.ts`. Complex inline object types are extracted into named declarations.

## Vue

`<script setup lang="ts">` exclusively. Props and emits are declared through typed interfaces (`withDefaults(defineProps<Props>(), ...)`). Prefer `shallowRef()`; use `ref()` for objects; `reactive()` stays unused.

## Comments

Comments explain why, never how. Code should be self-explanatory; if a comment narrates what the next line does, delete the comment.

## Testing

Vitest covers the full stack: Nitro server routes and Vue components (happy-dom environment via `@nuxt/test-utils`). Test files sit next to the code they test: `foo.ts` → `foo.test.ts`. Use `describe`/`it`, never bare `test`. Mock external calls (TMDB) at the fetch/server boundary so tests stay offline-deterministic.

## Git & Delivery

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`…
- Pre-commit hook: simple-git-hooks runs lint-staged → `eslint --fix` on staged files.
- Trunk-based development off `main`: changes land as short-lived branches, squash-merged via PR (linear history); a push to `main` builds and deploys via Cloudflare Pages.
- pnpm is the only package manager; the lockfile is committed.

# Design System

The approved visual baseline for SpudTube UI work. Read before implementing any UI: components, screens, or styling. Token values are authored once in `app/assets/css/tailwind.css`; this document is the rule layer over them. Approved via Ticket #11; decision rationale lives in `.scratch/spudtube-v1/decisions/design-baseline.md`.

> Contract, not pixels: the rules below are the spec. Concrete UI will keep changing until v1 ships; treat any mockup pixel as reference, never as contract.

## Core direction

- **Dark-only.** No light theme, no system-follow toggle. `:root` carries the dark values; `.dark` stays an identity block so a light mode could be re-added later.
- **Cinematic immersion through layout, not effects.** Near-black base, a large flat "now showing" hero, one control toolbar, poster rows like a hallway of lightboxes. Depth comes from contrast, whitespace, and frosted glass — never glow.
- **Accent is neutral.** Brand accent is not locked in. `--primary` is near-white (`oklch(0.922 0 0)`); changing an accent later means editing `--primary` / `--ring` in `tailwind.css` only — no component changes.

## Tokens

Dark-only, `:root` == `.dark`, written into `app/assets/css/tailwind.css`:

| Token | Value | Use |
|---|---|---|
| `--background` | `oklch(0.105 0.012 275)` | near-black night base |
| `--foreground` | `oklch(0.96 0.008 280)` | primary text |
| `--card` | `oklch(0.17 0.018 278)` | surfaces one step up from background |
| `--card-foreground` | `oklch(0.96 0.008 280)` | |
| `--popover` | `oklch(0.17 0.018 278)` | |
| `--primary` | `oklch(0.922 0 0)` | single action accent (neutral today) |
| `--primary-foreground` | `oklch(0.205 0 0)` | |
| `--secondary` | `oklch(0.24 0.02 282)` | hover / quiet fills |
| `--secondary-foreground` | `oklch(0.96 0.008 280)` | |
| `--muted` | `oklch(0.24 0.02 282)` | |
| `--muted-foreground` | `oklch(0.72 0.015 285)` | secondary text |
| `--accent` | `oklch(0.24 0.025 285)` | |
| `--accent-foreground` | `oklch(0.96 0.008 280)` | |
| `--destructive` | `oklch(0.72 0.2 25)` | bright warning red, only for destructive actions |
| `--border` | `oklch(1 0 0 / 9%)` | |
| `--input` | `oklch(1 0 0 / 13%)` | |
| `--ring` | `oklch(0.556 0 0)` | neutral focus ring |
| `--radius` | `0.625rem` | |

Sidebar tokens mirror card/accent/primary.

## Rules

These bind every UI ticket. When a later ticket proposes a visual pattern, check it against these first.

- **No gradients, no colored glows.** Selected states are solid accent fill. Panels use frosted glass (`backdrop-filter: blur(16px) saturate(1.5)`). Shadows are neutral black. Poster art is the only color source on screen.
- **No emoji.** Every icon is a Lucide line icon; active states may fill (bookmark, star). Logo, ratings, watch status, empty states all use SVG, never emoji.
- **Immersion is layout, not decoration.** Prefer more whitespace, a quieter chrome, and bigger imagery over decorative effects.
- **Top bar = floating frosted capsule** inside the container, rounded on all sides, with a hairline border and soft neutral shadow. Hides on scroll down, reappears on scroll up.
- **Destructive is never the brand.** `--destructive` only on genuinely destructive actions (remove / delete), never styled like a primary button.

## Type

Single family **Inter**; weights 400/500/600/700/800. Chinese fallback Noto Sans TC, line-height 1.7. UI default 14px.

| Role | Size/Line | Weight |
|---|---|---|
| hero (featured headline) | 36/44 | 800 |
| h1 (title) | 24/32 | 700 |
| row heading | 16.5/24 | 700 |
| body (default) | 14/22 | 400 |
| caption / metadata | 12.5 | 500 |

## Spacing & density

- **4** icon-to-text gap · **8** chip gap, within-group · **16** card padding, grid gutter · **32** between blocks.
- Controls: button / input height 38px, chips 30px, radius `--radius` (10px). Touch targets ≥ 40px.
- **Density = comfortable.** Result grid cards min 176px; category strip cards 168px; strip bottom whitespace ≥ 22px so the scrollbar never touches cards.

## Icons

- Lucide line icons, stroke 1.75, sizes 16 / 20 / 24.
- Exception: active states may fill (bookmark, star). No emoji anywhere.

## Interaction patterns

- **Ratings (Netflix-style).** One rating icon reveals three choices (awesome / good / sucks) on hover with animation; the selected rating persists on the icon; click again to clear.
- **Browse and search are separate modes** (spec story 7) — never combine genre-browse filters with keyword-search results.
- **Watch status machine:** none → watchlisted → watched; marking watched auto-removes from watchlist (spec story 27).
- **Infinite scroll** wherever a list can grow (spec story 6).

## Approved screens

Three key screens were mocked and approved in the interactive prototype (`docs/design/spudtube-v1-prototype.html`):

1. **Home / browse** — near-black base, floating capsule top bar, featured "now showing" hero, single control toolbar (kind seg | rating chips | genre chips | clear-all), poster category rows, each row's "view all" → dedicated topic page (no filters, infinite scroll).
2. **Title detail** — TMDB-style single-column hero (title aligned with poster; meta chips, average rating + 3-way rate icon, actions, tagline, overview, crew line), below a two-column grid (facts + keywords sidebar | providers / cast row / trailer), bottom recommendations strip.
3. **My List** — three tabs (watchlist / watched / rated); rows reflect detail-page actions live.
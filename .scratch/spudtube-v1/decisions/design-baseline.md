# Design baseline decisions

**Ticket:** #11 Design system baseline
**Status:** decided — mockups reviewed and approved by owner
**Date:** 2026-08

Produced via the throwaway interactive prototype (v8 final), preserved as `docs/design/spudtube-v1-prototype.html` for visual reference. This file is the durable record of the approved design system. Tokens are written into `app/assets/css/tailwind.css`.

> Scope note (owner): what we record here is the **design-system spec** — theme tokens, type scale, spacing/density, icon stance. The concrete UI will keep changing until v1 ships; pixels in the mockups are reference, not contract.

## Approved decisions

### Q1 · Color mode: dark only

- Only dark mode; no light theme, no system-follow toggle.
- `:root` carries the dark values directly; `.dark` block is kept as an identity block so a future light mode can be re-added without restructuring.
- Rationale: owner-specified during prototype round 1. Tokens keep shadcn-vue's `.dark` structure for reversibility.

### Q2 · Accent color: neutral for now

- Use the pure-neutral palette today: shadcn-vue default neutral dark tokens.
  - `--primary: oklch(0.922 0 0)` (near-white), `--primary-foreground: oklch(0.205 0 0)`.
- No brand accent is locked in. When one is chosen, change `--primary` / `--ring` in the CSS file only — no component changes needed.
- Candidate accents kept as reference (not decided): 幽夜紫, 極光青, 馬鈴薯金, 翡翠綠, 珊瑚紅, 劇院紅 (`oklch(0.5 0.17 26)`, deep curtain red), 天空藍.
- Rationale: owner feedback round 7 — "currently no accent fits; use neutral; swap later from the css file".

### Q3 · Poster density: comfortable

- Result grid cards ≥ 176px; category strip cards 168px; strip bottom padding enlarged so the scrollbar never touches cards.
- Rationale: owner-specified in round 2; density decided.

## Established constraints (from owner feedback across rounds)

- **No gradients, no colored glows anywhere.** Selected states = solid accent fill; panels = frosted glass (`backdrop-filter: blur + saturate`); shadows = neutral black only. Poster art is the only color source on screen.
- **No emoji.** Full site ban unless the owner explicitly picks specific ones. Logo, ratings, watch status, empty states all use line-style SVG icons (Lucide vocabulary, stroke 1.75).
- **Cinematic immersive feel, achieved through layout** — not effects: near-black background, big "now showing" hero (flat tone panel), one control toolbar, poster rows like a hallway of lightboxes. Layers come from light/dark contrast, whitespace, and frosted glass.
- **Top bar = floating frosted capsule** inside the container (rounded all sides), hides on scroll down / reappears on scroll up.
- **Destructive presentation:** destructive is never to be confused with the brand accent. Use a brighter warning red (`oklch(0.72 0.2 25)`) only for genuinely destructive actions (remove/delete), never styled like a brand primary button.
- **Ratings interaction (Netflix-style):** a single rating icon that reveals three choices (awesome / good / sucks) on hover with animation; selected rating persists on the icon; click again to clear.

## Design-system tokens (written to tailwind.css)

Dark-only tokens, `:root` == `.dark`:

| Token | Value | Notes |
|---|---|---|
| `--background` | `oklch(0.105 0.012 275)` | near-black, blue-violet night |
| `--foreground` | `oklch(0.96 0.008 280)` | |
| `--card` | `oklch(0.17 0.018 278)` | one step up from background |
| `--card-foreground` | `oklch(0.96 0.008 280)` | |
| `--popover` | `oklch(0.17 0.018 278)` | |
| `--primary` | `oklch(0.922 0 0)` | neutral (Q2) |
| `--primary-foreground` | `oklch(0.205 0 0)` | |
| `--secondary` | `oklch(0.24 0.02 282)` | |
| `--secondary-foreground` | `oklch(0.96 0.008 280)` | |
| `--muted` | `oklch(0.24 0.02 282)` | |
| `--muted-foreground` | `oklch(0.72 0.015 285)` | |
| `--accent` | `oklch(0.24 0.025 285)` | |
| `--accent-foreground` | `oklch(0.96 0.008 280)` | |
| `--destructive` | `oklch(0.72 0.2 25)` | bright warning red, not brand |
| `--border` | `oklch(1 0 0 / 9%)` | |
| `--input` | `oklch(1 0 0 / 13%)` | |
| `--ring` | `oklch(0.556 0 0)` | neutral focus ring |
| `--radius` | `0.625rem` | |

Sidebar tokens mirror card/accent/primary.

## Type scale

- Single family **Inter**; weights 400/500/600/700/800. Chinese fallback Noto Sans TC, line-height 1.7.
- UI default 14px. Scale (from prototype §2):
  - hero (featured headline): 36/44, weight 800
  - h1 (title): 24/32, weight 700
  - row heading: 16.5/24, weight 700
  - body: 14/22, weight 400
  - caption/metadata: 12.5, weight 500

## Spacing & density

- 4: icon-to-text gap · 8: chip gap, within-group · 16: card padding, grid gutter · 32: between blocks.
- Controls: button/input height 38px, chips 30px, radius 10px (`--radius`). Touch targets ≥ 40px.
- Poster density = comfortable (Q3): grid min 176px; strips 168px; strip bottom whitespace ≥ 22px.

## Icon stance

- Unified Lucide line icons, stroke 1.75, sizes 16/20/24.
- Exception: active states may fill (bookmark, star). No emoji anywhere.

## Key-screen mockups (approved)

Three screens were mocked interactively in the prototype and approved:
1. **Home / browse** — near-black bg, floating capsule top bar, featured "now showing" hero, single control toolbar (kind seg | rating chips | genre chips | clear-all), poster category rows with per-row "view all" → dedicated topic page (no filters, infinite scroll).
2. **Title detail** — TMDB-style single-column hero (title aligned with poster height; meta chips, average rating + 3-way rate icon, actions, tagline, overview, crew line), below a two-column grid (facts + keywords sidebar | providers / cast row / trailer), bottom recommendations strip.
3. **My List** — three tabs (watchlist / watched / rated), rows reflect detail-page actions live.

## Follow-up for later UI tickets

- Browse vs search remain two separate modes (spec story 7).
- Availability grouped subscription → free → rent → buy (spec story 12).
- Watch status machine: none → watchlisted → watched; watched auto-removes from watchlist (spec story 27).
- Infinite scroll everywhere lists can grow (spec story 6).
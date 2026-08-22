# 07: Availability panel & Region switcher

**What to build:** On every detail page: streaming Availability grouped subscription → free → rent → buy with Provider logos from the TMDB CDN; Region defaults to DetectedRegion from the platform country header; a curated 14-region switcher (TW, HK, JP, KR, SG, US, GB, CA, AU, DE, FR, IN, BR, MX) whose choice persists browser-side only; TMDB and JustWatch attributions visible wherever provider data appears.

**Blocked by:** 06.

**Status:** ready-for-human

- [x] Groups render in fixed order; Titles with zero Providers here show an explicit unavailable-in-this-region state while staying fully browsable
- [x] Switching Region updates Availability only — catalog content is never filtered or hidden
- [x] Detected default honored from header fixture; manual selection survives reload
- [x] Attributions render alongside provider data
- [x] Panel tested against faked provider payloads incl. empty/multi-group cases

## Comments

Implemented on the current branch — `feat: availability panel & region switcher (ticket 07)`.

- **Region logic** (`shared/region/region.ts` + `region.test.ts`): `CURATED_REGIONS` (14, display order from spec), `Region` union, `REGION_COOKIE` (`spudtube-region`), `countryToRegion` (curated-country → Region or null), `resolveSelectedRegion` (persisted cookie wins → DetectedRegion → `DEFAULT_REGION` `TW`, the product's primary market; the spec leaves the non-curated-detected case open). Mirrors the ticket-02 locale pattern (`shared/i18n/locale.ts`), including reuse of `DETECTED_COUNTRY_KEY`: the language middleware already bridges `cf-ipcountry` server→client via `useState`, so the panel gets the DetectedRegion for free.
- **Header fixture**: extracted the middleware's header extraction into a shared pure `readDetectedCountry(headers)` (array/absent handling), unit-tested with `cf-ipcountry` fixtures; `app/middleware/language.global.ts` now uses it. SSR-only glue was already verified in ticket 02's built-server checks.
- **Composables**: `use-region.ts` (cookie-backed `region` computed + `setRegion` that persists browser-side only — never the database, never filters catalog content) and `use-availability.ts` (fetches the existing `GET /api/catalog/:kind/:id/providers` route, which returns the full per-region catalog).
- **Panel** (`app/components/availability-panel.vue`): frosted panel per design-system baseline; globe heading + 14-option Region `<select>`; groups render in fixed subscription → free → rent → buy order (non-empty only); Provider logos from the TMDB CDN (`providerLogoUrl`, `w92`) on `bg-muted` chips with text fallback for logo-less Providers; zero-Provider Regions get the explicit "此區域暫無串流資訊" state plus the never-hidden hint; TMDB + JustWatch attribution line renders alongside provider data (ADR 0001); loading/error states. Wired into `title-detail-page.vue` (main column, above the trailer).
- **Tests**: `availability-panel.test.ts` (10 tests — group order, logo chips/CDN urls, unavailable state, attributions, 14-option switcher, persisted-region default, switching updates Availability only, loading/error, logo-less fallback), page-level tests for both routes register the providers endpoint and assert the panel renders with default-Region providers, `region.test.ts` (11 tests), `readDetectedCountry` fixtures in `locale.test.ts`.
- **Files**: new `shared/region/region.{ts,test.ts}`, `app/composables/use-region.ts`, `use-availability.ts`, `app/components/availability-panel.{vue,test.ts}`, `app/lib/availability-fixtures.ts`; modified `shared/i18n/locale.ts`, `app/middleware/language.global.ts`, `title-detail-page.vue`, `app/lib/images.ts`, `i18n/locales/{en,zh-TW}.json`, page tests.

Verification evidence: `pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0; `pnpm test` 30 files / 132 tests green. No live SSR check possible locally (no `TMDB_TOKEN` in env), so header-path glue rests on the ticket-02 verified bridge + the new `readDetectedCountry` fixtures.

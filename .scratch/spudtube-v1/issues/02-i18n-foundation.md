# 02: i18n foundation (zh-TW / en)

**What to build:** Locale infrastructure done FIRST so every later UI ticket writes translation keys from day one: `zh-TW` (default) and `en` locale bundles lazy-loaded via @nuxtjs/i18n; display locale derived from the same country signal as Region — `TW` → zh-TW, everything else → en; a manual switcher whose choice persists browser-side and permanently overrides the geo default.

**Blocked by:** 01.

**Status:** ready-for-human

- [x] Country→locale mapping unit-tested (TW→zh-TW, others→en)
- [x] Switcher changes language instantly; choice survives reload (browser persistence)
- [x] Scaffold strings already served from locale bundles
- [x] Locale chunks load lazily (not shipped in the main bundle)

## Comments

Implemented on `feat/i18n-foundation`. Summary of decisions:

- **@nuxtjs/i18n 10.6.0**: `strategy: 'no_prefix'` (single URL space, locale never in the path), `defaultLocale: 'en'`, lazy loading via per-locale `file` keys under `i18n/locales/`. Messages compile to one raw chunk per locale; no locale strings ship in the client entry bundle. Note: zh-TW is the product's primary market language, but the module-level default is `en` because the country signal always picks the concrete per-visitor locale — a visitor with no signal must get `en` (spec: "everything else → en"), and leaving the default zh-TW would leak Chinese to non-TW visitors on any render that bypasses the middleware.
- **Geo default, not browser detection**: `detectBrowserLanguage: false` disables the module's cookie/navigator/accept-language chain — it would override the country signal and write its own cookie behind our backs. Display locale is resolved by a global route middleware (`app/middleware/language.global.ts`): persisted `spudtube-locale` cookie if present, else `countryToLocale(cf-ipcountry header)`, else `en`. The country header is bridged server→client through a `useState` payload so SSR and hydration agree.
- **Pure logic**: `shared/i18n/locale.ts` (consumed via the `#shared` alias) — `countryToLocale` (TW→zh-TW, everything else en), `resolveDisplayLocale` (a valid persisted choice wins permanently), `isAppLocale` guard.
- **Switcher** (`app/components/language-switcher.vue`): calls `setLocale` (instant switch under no_prefix) then writes the `spudtube-locale` cookie explicitly — setLocale does not persist when `detectBrowserLanguage` is false — so the choice survives reload and permanently beats the geo default. `useHead` keeps `<html lang>` in sync with the display locale.
- **English fallback**: `i18n/i18n.config.ts` sets `fallbackLocale: 'en'` so missing zh-TW keys resolve to English (foundation for ticket 17's overview fallback).
- **Scaffold strings**: `home.title` / `home.tagline` / `language.label` live in both bundles; the app shell renders them via `t()`.

Verification evidence: all four gates exit 0 (typecheck, lint, test 17/17, build); happy-dom tests cover switcher rendering / active state / instant switch / cookie persistence and geo-vs-persisted resolution through the real middleware; node tests cover the country→locale mapping. Built-server SSR checks: `cf-ipcountry: TW` renders zh-TW text and `<html lang="zh-TW">`, no header renders en + `<html lang="en">`, TW + `spudtube-locale=en` cookie renders English (override wins), and geo detection sets no cookie. Client entry chunks contain no locale strings; per-locale message raw chunks confirmed under `.output/server/chunks/raw/`.

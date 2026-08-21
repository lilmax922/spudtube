# 02: i18n foundation (zh-TW / en)

**What to build:** Locale infrastructure done FIRST so every later UI ticket writes translation keys from day one: `zh-TW` (default) and `en` locale bundles lazy-loaded via @nuxtjs/i18n; display locale derived from the same country signal as Region — `TW` → zh-TW, everything else → en; a manual switcher whose choice persists browser-side and permanently overrides the geo default.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] Country→locale mapping unit-tested (TW→zh-TW, others→en)
- [ ] Switcher changes language instantly; choice survives reload (browser persistence)
- [ ] Scaffold strings already served from locale bundles
- [ ] Locale chunks load lazily (not shipped in the main bundle)

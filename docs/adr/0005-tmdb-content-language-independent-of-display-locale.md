# TMDB content language is independent of UI DisplayLocale

## Context

Ticket 03 (`server/tmdb/client.ts`) hardcodes every TMDB call to `language=zh-TW` and falls back to the English overview/tagline only when the localized copy is empty (`pickOverview`). The detail-page handoff for ticket 06 (`/var/folders/jx/cxrwdcl17hdbq7mbhn6czbsc0000gn/T/opencode/handoff-ticket06-align-prototype.md`, line "dev server 驗證網址") read this as "TMDB 資料語系跟隨顯示語系" — but that sentence was a verification note, not a behavioural claim, and it directly contradicts the existing glossary.

`CONTEXT.md` is the source of truth on this: **DisplayLocale** is the locale the *interface* renders in and "never changes catalog content or Availability, which follow Region"; **Region** never filters which Titles appear and only changes which Providers are shown. Neither concept maps to the language TMDB returns for a Title's overview/tagline — that is a third axis, currently hardcoded.

Owner flagged this during ticket 06 review: switching the language switcher from `zh-TW` to `en` left the overview, tagline, genres and trailer preferences in Chinese, which read as a bug. Two reasonable readings are possible:

- (A) The current behaviour is correct: TMDB returns zh-TW with en fallback; DisplayLocale only paints chrome. The user's "bug" is a misunderstanding carried over from the handoff note.
- (B) DisplayLocale should drive TMDB `language`: switching to `en` makes TMDB return English content, fallback to zh-TW when missing.

We pick (A) and pin the rationale here so the question stops re-surfacing in every UI ticket.

## Decision

TMDB content language is an independent axis from `DisplayLocale` and from `Region`. The TMDB client requests `language=zh-TW` for every call; the mapper falls back to the English overview/tagline when the localized one is empty. The language switcher in the top bar only repaints the interface; it does **not** affect TMDB responses. `Region` does **not** affect TMDB responses either — it only gates the provider list (`/watch/providers`).

DisplayLocale, Region, and TMDB content language therefore form three independent axes:

| Switch | Affects |
|---|---|
| `DisplayLocale` (cookie `spudtube-locale`, default `zh-TW`/`en`) | UI strings (`vue-i18n`), nothing on the server. |
| `Region` (cookie `spudtube-region`, default from `cf-ipcountry`) | Provider lists per Title (`/watch/providers`); not the Title's own copy. |
| TMDB content language (server-only constant `DEFAULT_TMDB_LANGUAGE`) | Title overview, tagline, genres list, trailer preference; always `zh-TW` today, with `en` as the empty-translation fallback. |

The detail-page handoff note that read "TMDB 資料語系跟隨顯示語系" is **wrong** — treat it as a verification-time note, not a spec requirement.

## Consequences

- The TMDB client stays as-is: `language: DEFAULT_TMDB_LANGUAGE` (`'zh-TW'`) for `searchMulti`, `discover`, `title`, `recommendations`; `genres` and `watchProviders` omit the parameter because TMDB requires it. `pickOverview` and `pickTrailerKey` keep the `zh → en → official → first` preference order.
- UI tickets (06, 07, 09, 10, etc.) can safely display whatever language the data carries without negotiating per-call. They never need to know the user's `DisplayLocale` when calling `useFetch`.
- A future "English-first" product pivot would mean changing `DEFAULT_TMDB_LANGUAGE` and the preference order in `pickOverview`/`pickTrailerKey` (inverting it). That belongs in a new ADR; do not adjust it ad-hoc in UI tickets.
- If a visitor reports a Title missing Chinese copy, treat it as a `pickOverview`/TMDB data issue, not a DisplayLocale wiring bug — the verification handoff is the most likely source of confusion.

## Considered Options

- **Bind TMDB language to DisplayLocale** (rejected): contradicts `CONTEXT.md`, requires plumbing locale through every proxy route and the composable layer, multiplies the cache footprint (`detail:zh-TW:419430` vs `detail:en:419430`), and gives the visitor a *less* curated experience (English overviews for non-English films are often poorer than the Chinese summary TMDB already returns). Revisit only if owner explicitly chooses the English-first direction.
- **Bind TMDB language to Region** (rejected): Region's role is provider availability, not content language. The product brief already states Regions never filter which Titles exist or appear.
- **Bind TMDB language to both Region and DisplayLocale** (rejected): same problems as DisplayLocale binding, plus the conceptual confusion of mixing two switches.
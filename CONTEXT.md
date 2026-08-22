# SpudTube

SpudTube helps people decide what to watch: discover movies and TV shows, find where a title streams in a given region, and keep personal ratings and lists.

## Language

### Catalog

**Title**:
A single movie or TV show, treated as one indivisible work down to whole-title granularity (no season/episode breakdown).
_Avoid_: content, item, work

**Kind**:
Whether a Title is a movie or a TV show. Exactly one of `MOVIE` | `TV_SHOW`.
_Avoid_: type, media_type

**Genre**:
A catalog category assigned to a Title (e.g., Thriller, Comedy), used for browsing and filtering.

### Region & Availability

**Region**:
A country/region used to look up Availability. Regions never filter which Titles exist or appear; they only change which Providers are shown.
_Avoid_: country, locale, market

**DetectedRegion**:
The Region inferred from the visitor's IP address on each request. Serves only as the default value of the selected Region.
_Avoid_: home region, auto region

**Provider**:
A streaming service that carries Titles in a Region (e.g., Netflix).
_Avoid_: platform, channel, service

**Availability**:
The set of Providers carrying a given Title in a given Region. Zero or many Providers per Title per Region.

### Display locale

**DisplayLocale**:
The `zh-TW` | `en` locale the interface renders in. Its default derives from the same platform country signal as DetectedRegion (`TW` → zh-TW, everything else → `en`); a manual per-browser choice overrides it permanently. It never changes catalog content or Availability, which follow Region.
_Avoid_: country, market

### Personal Tracking

**User**:
A person who has signed in with an account. Only Users rate Titles and keep personal lists; browsing requires no sign-in.
_Avoid_: member, account, profile

**Rating**:
A User's verdict on a Title — exactly one of `AWESOME`, `GOOD`, `SUCKS`. One Rating per User per Title, editable and removable, independent of WatchStatus. Labels are canonical; numeric orderings are presentation only.
_Avoid_: score, stars, review

**WatchStatus**:
A User's per-Title state — exactly one of `WATCHLISTED`, `WATCHED`, or none. Mutually exclusive: marking a Title `WATCHED` removes it from the Watchlist.
_Avoid_: bookmark, favorite, saved

**Watchlist**:
The set of Titles a User has marked `WATCHLISTED`.

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

### Browse & Discovery

**ContentRow**:
A single horizontal section on the browse surface — title, an optional "See more" action, and one BrowseCarousel of TitleCards. Rows are derived as slices of the same Title collection (e.g., by popularity, rating, recency, or Genre).
_Avoid_: rails, shelf, lane

**BrowseCarousel**:
The horizontally scrollable viewport inside a ContentRow that presents TitleCards. It owns peek, gap, row padding, breakout/full-bleed behavior, and page-by-page scrolling. Exactly one per ContentRow.
_Avoid_: slider, scroller, vega carousel

**TitleCard**:
The card representing a single Title inside a BrowseCarousel (or grid). It shows the Title's artwork, year, and rating, and reveals additional detail on hover/focus. It does not encode Availability; that belongs to the Title detail surface.
_Avoid_: tile, poster, video, thumbnail

### Layout

**MaxContentWidth**:
The maximum inline size of every centered page surface (header inner, BrowseGrid, ContentRow head, footers, detail/my-list/search shells) before side gutters take over. A single CSS variable (`--max-content-width`) is the source of truth; all `max-width` and gutter math derive from it.
_Avoid_: container width, page width, max-width, ContentMaxWidth

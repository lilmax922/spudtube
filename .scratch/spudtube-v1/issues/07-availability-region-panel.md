# 07: Availability panel & Region switcher

**What to build:** On every detail page: streaming Availability grouped subscription → free → rent → buy with Provider logos from the TMDB CDN; Region defaults to DetectedRegion from the platform country header; a curated 14-region switcher (TW, HK, JP, KR, SG, US, GB, CA, AU, DE, FR, IN, BR, MX) whose choice persists browser-side only; TMDB and JustWatch attributions visible wherever provider data appears.

**Blocked by:** 06.

**Status:** ready-for-agent

- [ ] Groups render in fixed order; Titles with zero Providers here show an explicit unavailable-in-this-region state while staying fully browsable
- [ ] Switching Region updates Availability only — catalog content is never filtered or hidden
- [ ] Detected default honored from header fixture; manual selection survives reload
- [ ] Attributions render alongside provider data
- [ ] Panel tested against faked provider payloads incl. empty/multi-group cases

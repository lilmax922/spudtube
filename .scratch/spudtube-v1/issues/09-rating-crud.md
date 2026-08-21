# 09: Rating CRUD

**What to build:** On every detail page a signed-in User can rate the Title AWESOME / GOOD / SUCKS. Exactly one Rating per User per Title — re-rating updates, never duplicates — changeable and removable. Anonymous attempts prompt sign-in. Ratings are private: nothing exposes one User's verdicts to another.

**Blocked by:** 06, 08, 14.

**Status:** ready-for-agent

- [ ] Create / update / delete reflected immediately in UI and persisted
- [ ] Primary key enforces single-Rating-per-Title per User (integration-tested)
- [ ] Invalid payloads rejected with 400 `{ issues }` before any business logic runs (integration-tested)
- [ ] Cross-user isolation integration-tested: one User's Ratings are invisible and unwritable by another
- [ ] Anonymous click gates with login redirect/prompt
- [ ] Component tests cover idle/rated/changing states of the rating trio (S3)

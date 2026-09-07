/**
 * Canonical personal tracking values (CONTEXT.md: Rating, WatchStatus).
 * Each User holds at most one Rating and one WatchStatus per Title.
 * Server enum tables derive from these lists. The delete semantics stay
 * divergent by design: ratings hard-delete rows while statuses clear to
 * NULL in place (ADR 0003).
 */
export const RATING_LABELS = ['AWESOME', 'GOOD', 'SUCKS'] as const

export type RatingLabel = (typeof RATING_LABELS)[number]

export const WATCH_STATUSES = ['WATCHLISTED', 'WATCHED'] as const

export type WatchStatus = (typeof WATCH_STATUSES)[number]

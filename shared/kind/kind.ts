/**
 * Canonical Title kind (CONTEXT.md: Kind): exactly one of MOVIE | TV_SHOW.
 * Lives in shared so client and server name the same type without
 * deep-importing server paths. Server enum tables derive from KINDS.
 */
export const KINDS = ['MOVIE', 'TV_SHOW'] as const

export type Kind = (typeof KINDS)[number]

// Re-export for legacy path compatibility (ADR 0004 / ticket 01 mentions server/utils/tmdb/schemas.ts).
// Canonical hand-written TMDB schemas live in server/tmdb/schemas.ts — this file is a thin alias
// so both import paths resolve and remain server-only (never imported via #server or app).
export * from '../../tmdb/schemas'

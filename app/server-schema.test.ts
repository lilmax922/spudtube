import type { Kind, RatingLabel, WatchStatus } from '#server/db/schema'
import { describe, expect, it } from 'vitest'
import {
  InsertRatingSchema,
  InsertTitleStatusSchema,
  SelectRatingSchema,
  SelectTitleStatusSchema,
  UpdateRatingBodySchema,
  UpdateRatingSchema,
  UpdateTitleStatusBodySchema,
  UpdateTitleStatusSchema,
} from '#server/db/schema'

describe('schemas reached through the #server alias', () => {
  it('validate payloads with the same objects the server parses with', () => {
    expect(InsertRatingSchema.safeParse({ kind: 'MOVIE', tmdbId: 424, label: 'GOOD' }).success).toBe(true)

    const rejected = InsertRatingSchema.safeParse({ kind: 'movie', tmdbId: -424 })
    expect(rejected.success).toBe(false)
    if (!rejected.success) {
      expect(Object.keys(rejected.error.flatten().fieldErrors)).toEqual(['kind', 'tmdbId', 'label'])
    }
  })

  it('derive select shapes from the table definition', () => {
    expect(SelectRatingSchema.safeParse({
      createdAt: new Date(),
      kind: 'TV_SHOW',
      label: 'AWESOME',
      tmdbId: 1399,
      updatedAt: new Date(),
      userId: 'u-1',
    }).success).toBe(true)
  })

  it('carry canonical vocabulary into types', () => {
    const kind: Kind = 'TV_SHOW'
    const label: RatingLabel = 'SUCKS'
    const status: WatchStatus = 'WATCHLISTED'
    expect([kind, label, status]).toEqual(['TV_SHOW', 'SUCKS', 'WATCHLISTED'])
  })

  it('expose update schemas that omit identity and timestamps', () => {
    expect(UpdateRatingSchema.safeParse({ label: 'AWESOME' }).success).toBe(true)
    expect(UpdateRatingSchema.safeParse({ label: 'MEH' }).success).toBe(false)
    expect(UpdateTitleStatusSchema.safeParse({ status: 'WATCHED' }).success).toBe(true)
    expect(UpdateTitleStatusSchema.safeParse({ status: 'UNKNOWN' }).success).toBe(false)
  })

  it('expose body schemas derived at definition site so routes need no inline composition', () => {
    expect(UpdateRatingBodySchema.safeParse({ label: 'GOOD' }).success).toBe(true)
    expect(UpdateRatingBodySchema.safeParse({}).success).toBe(false)
    expect(UpdateRatingBodySchema.safeParse({ label: 'MEH' }).success).toBe(false)
    expect(UpdateTitleStatusBodySchema.safeParse({ status: 'WATCHLISTED' }).success).toBe(true)
    expect(UpdateTitleStatusBodySchema.safeParse({}).success).toBe(false)
  })

  it('derive title_status insert shapes and enforce positive tmdbId', () => {
    expect(InsertTitleStatusSchema.safeParse({ kind: 'MOVIE', status: 'WATCHED', tmdbId: 424 }).success).toBe(true)
    expect(InsertTitleStatusSchema.safeParse({ kind: 'MOVIE', status: 'WATCHED', tmdbId: -1 }).success).toBe(false)
    expect(SelectTitleStatusSchema.safeParse({
      createdAt: new Date(),
      kind: 'MOVIE',
      status: 'WATCHED',
      tmdbId: 424,
      updatedAt: new Date(),
      userId: 'u-1',
    }).success).toBe(true)
    expect(SelectTitleStatusSchema.safeParse({
      createdAt: new Date(),
      kind: 'MOVIE',
      status: null,
      tmdbId: 424,
      updatedAt: new Date(),
      userId: 'u-1',
    }).success).toBe(true)
  })
})

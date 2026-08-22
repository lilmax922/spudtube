import type { Kind, RatingLabel } from '#server/db/schema'
import { describe, expect, it } from 'vitest'
import { InsertRatingSchema, SelectRatingSchema } from '#server/db/schema'

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
    expect([kind, label]).toEqual(['TV_SHOW', 'SUCKS'])
  })
})

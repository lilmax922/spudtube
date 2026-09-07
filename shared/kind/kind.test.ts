import { describe, expect, it } from 'vitest'
import { KINDS } from './kind'

describe('kINDS', () => {
  it('matches the database kind enum values', () => {
    expect([...KINDS]).toEqual(['MOVIE', 'TV_SHOW'])
  })
})

import { describe, expect, it } from 'vitest'
import { RATING_LABELS, WATCH_STATUSES } from './personal-tracking'

describe('rATING_LABELS', () => {
  it('matches the database rating_label enum values', () => {
    expect([...RATING_LABELS]).toEqual(['AWESOME', 'GOOD', 'SUCKS'])
  })
})

describe('wATCH_STATUSES', () => {
  it('matches the database watch_status enum values', () => {
    expect([...WATCH_STATUSES]).toEqual(['WATCHLISTED', 'WATCHED'])
  })
})

import { describe, expect, it } from 'vitest'
import { resolveExpandableShift } from './use-expandable-geometry'

describe('resolveExpandableShift', () => {
  it('needs no glide for a card on the left half', () => {
    expect(resolveExpandableShift({
      cardLeft: 40,
      viewportWidth: 1512,
      expandedWidth: 540,
      margin: 24,
    })).toBe(0)
  })

  it('glides the row left so a right-half card stays inside the viewport', () => {
    // 1020 + 540 overflows 1512 - 24 by exactly 72.
    expect(resolveExpandableShift({
      cardLeft: 1020,
      viewportWidth: 1512,
      expandedWidth: 540,
      margin: 24,
    })).toBe(72)
  })

  it('glides the row left for the last card pinned at the viewport edge', () => {
    // 1292 + 540 overflows 1512 - 24 by 344.
    expect(resolveExpandableShift({
      cardLeft: 1292,
      viewportWidth: 1512,
      expandedWidth: 540,
      margin: 24,
    })).toBe(344)
  })

  it('glides by the exact overflow near the middle of a narrow desktop viewport', () => {
    // 350 + 540 overflows 900 - 24 by 14.
    expect(resolveExpandableShift({
      cardLeft: 350,
      viewportWidth: 900,
      expandedWidth: 540,
      margin: 24,
    })).toBe(14)
  })

  it('keeps the expanded card fully inside the viewport on a narrow sweep', () => {
    const viewportWidth = 881
    const margin = 24
    const expandedWidth = 540
    for (let cardLeft = 24; cardLeft + 180 <= viewportWidth - margin; cardLeft += 37) {
      const shift = resolveExpandableShift({ cardLeft, viewportWidth, expandedWidth, margin })
      expect(shift).toBeGreaterThanOrEqual(0)
      expect(cardLeft - shift).toBeGreaterThanOrEqual(0)
      expect(cardLeft - shift + expandedWidth).toBeLessThanOrEqual(viewportWidth - margin)
    }
  })

  it('falls back to zero shift when nothing is measured yet', () => {
    expect(resolveExpandableShift({
      cardLeft: 0,
      viewportWidth: 1024,
      expandedWidth: 540,
      margin: 24,
    })).toBe(0)
  })

  it('defaults to the 540px expansion width and 24px margin', () => {
    expect(resolveExpandableShift({ cardLeft: 1020, viewportWidth: 1512 })).toBe(72)
  })
})

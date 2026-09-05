import { describe, expect, it } from 'vitest'
import { resolveExpandableGeometry } from './use-expandable-geometry'

describe('resolveExpandableGeometry', () => {
  it('opens rightward with no shift for a card on the left half', () => {
    expect(resolveExpandableGeometry({
      cardLeft: 40,
      cardWidth: 180,
      viewportWidth: 1512,
      expandedWidth: 540,
      margin: 24,
    })).toEqual({ direction: 'right', panelLeft: 0 })
  })

  it('opens leftward with no shift for a card on the right half', () => {
    expect(resolveExpandableGeometry({
      cardLeft: 1020,
      cardWidth: 180,
      viewportWidth: 1512,
      expandedWidth: 540,
      margin: 24,
    })).toEqual({ direction: 'left', panelLeft: -360 })
  })

  it('opens leftward for the last card pinned at the viewport edge', () => {
    expect(resolveExpandableGeometry({
      cardLeft: 1292,
      cardWidth: 180,
      viewportWidth: 1512,
      expandedWidth: 540,
      margin: 24,
    })).toEqual({ direction: 'left', panelLeft: -360 })
  })

  it('clamps a rightward panel back inside the viewport near the middle', () => {
    // center 440 < 450 opens right, but 350 + 540 overflows 900 - 24.
    expect(resolveExpandableGeometry({
      cardLeft: 350,
      cardWidth: 180,
      viewportWidth: 900,
      expandedWidth: 540,
      margin: 24,
    })).toEqual({ direction: 'right', panelLeft: -14 })
  })

  it('clamps a leftward panel back inside the viewport gutter', () => {
    // center 470 >= 450 opens left, but the ideal left edge lands at 20 < 24.
    expect(resolveExpandableGeometry({
      cardLeft: 380,
      cardWidth: 180,
      viewportWidth: 900,
      expandedWidth: 540,
      margin: 24,
    })).toEqual({ direction: 'left', panelLeft: -356 })
  })

  it('opens leftward on an exact center tie', () => {
    expect(resolveExpandableGeometry({
      cardLeft: 410,
      cardWidth: 180,
      viewportWidth: 1000,
      expandedWidth: 540,
      margin: 24,
    }).direction).toBe('left')
  })

  it('falls back to a rightward rest panel when nothing is measured yet', () => {
    expect(resolveExpandableGeometry({
      cardLeft: 0,
      cardWidth: 0,
      viewportWidth: 1024,
      expandedWidth: 540,
      margin: 24,
    })).toEqual({ direction: 'right', panelLeft: 0 })
  })

  it('never leaves the viewport on a narrow desktop sweep', () => {
    const viewportWidth = 881
    const margin = 24
    for (let cardLeft = 24; cardLeft + 180 <= viewportWidth - margin; cardLeft += 37) {
      const { panelLeft } = resolveExpandableGeometry({
        cardLeft,
        cardWidth: 180,
        viewportWidth,
        expandedWidth: 540,
        margin,
      })
      expect(cardLeft + panelLeft).toBeGreaterThanOrEqual(margin)
      expect(cardLeft + panelLeft + 540).toBeLessThanOrEqual(viewportWidth - margin)
    }
  })
})

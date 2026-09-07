import { describe, expect, it } from 'vitest'
import {
  BROWSE_CAROUSEL_BREAKPOINTS,
  calculatePeekWidth,
  getBrowseVisibleCount,
  getMidSnapShift,
  resolveContentGutter,
  shouldReinitCarousel,
} from './use-carousel'

describe('calculatePeekWidth', () => {
  it('returns 1/4 of item width by default', () => {
    expect(calculatePeekWidth(180, 0.25)).toBe(45)
    expect(calculatePeekWidth(168, 0.25)).toBe(42)
    expect(calculatePeekWidth(220, 0.25)).toBe(55)
  })

  it('rounds to nearest integer', () => {
    expect(calculatePeekWidth(100, 0.25)).toBe(25)
    expect(calculatePeekWidth(101, 0.25)).toBe(25)
  })
})

describe('browse carousel breakpoints', () => {
  it('has expected breakpoint table', () => {
    expect(BROWSE_CAROUSEL_BREAKPOINTS).toEqual([
      { maxWidth: 447, count: 1 },
      { maxWidth: 679, count: 2 },
      { maxWidth: 879, count: 3 },
      { maxWidth: 1399, count: 3 },
      { maxWidth: 1799, count: 4 },
    ])
  })
})

describe('getBrowseVisibleCount', () => {
  it('returns 1 for <=447', () => {
    expect(getBrowseVisibleCount(0)).toBe(1)
    expect(getBrowseVisibleCount(320)).toBe(1)
    expect(getBrowseVisibleCount(447)).toBe(1)
  })

  it('returns 2 for 448-679', () => {
    expect(getBrowseVisibleCount(448)).toBe(2)
    expect(getBrowseVisibleCount(500)).toBe(2)
    expect(getBrowseVisibleCount(679)).toBe(2)
  })

  it('returns 3 for 680-879', () => {
    expect(getBrowseVisibleCount(680)).toBe(3)
    expect(getBrowseVisibleCount(700)).toBe(3)
    expect(getBrowseVisibleCount(879)).toBe(3)
  })

  it('returns 3 for 880-1399', () => {
    expect(getBrowseVisibleCount(880)).toBe(3)
    expect(getBrowseVisibleCount(1280)).toBe(3)
    expect(getBrowseVisibleCount(1399)).toBe(3)
  })

  it('returns 4 for 1400-1799', () => {
    expect(getBrowseVisibleCount(1400)).toBe(4)
    expect(getBrowseVisibleCount(1500)).toBe(4)
    expect(getBrowseVisibleCount(1799)).toBe(4)
  })

  it('returns 5 for >1799', () => {
    expect(getBrowseVisibleCount(1800)).toBe(5)
    expect(getBrowseVisibleCount(1920)).toBe(5)
    expect(getBrowseVisibleCount(2500)).toBe(5)
  })

  it('returns at least 1 for narrow or invalid width', () => {
    expect(getBrowseVisibleCount(-10)).toBe(1)
    expect(getBrowseVisibleCount(100)).toBe(1)
  })
})

describe('getMidSnapShift', () => {
  const gap = 16

  it('returns 0 for non-positive viewport width', () => {
    expect(getMidSnapShift(0, 180, gap, 0.25)).toBe(0)
    expect(getMidSnapShift(-100, 180, gap, 0.25)).toBe(0)
  })

  it('1920 / item 180 → shift 86 (symmetric 70px mid peeks)', () => {
    expect(getMidSnapShift(1920, 180, gap, 0.25)).toBe(86)
  })

  it('1280 / item 180 → shift 60 (symmetric 44px mid peeks)', () => {
    expect(getMidSnapShift(1280, 180, gap, 0.25)).toBe(60)
  })

  it('880 / item 180 → shift 56 (symmetric 40px mid peeks)', () => {
    expect(getMidSnapShift(880, 180, gap, 0.25)).toBe(56)
  })

  it('560 / item 180 → shift 92 (symmetric 76px mid peeks)', () => {
    expect(getMidSnapShift(560, 180, gap, 0.25)).toBe(92)
  })

  it('keeps mid peeks symmetric across viewport widths', () => {
    const w = 180
    const step = w + gap
    for (let width = 340; width <= 2560; width += 37) {
      const shift = getMidSnapShift(width, w, gap, 0.25)
      const hidden = (((step - shift) % step) + step) % step
      const visibleLeft = w - hidden
      const visibleRight = (hidden + width) % step
      expect(Math.abs(visibleLeft - visibleRight), `width ${width}`).toBeLessThanOrEqual(1)
      expect(visibleLeft, `width ${width}`).toBeGreaterThanOrEqual(0)
      expect(visibleLeft, `width ${width}`).toBeLessThanOrEqual(w)
    }
  })

  it('keeps mid peeks symmetric at the production 240px item width', () => {
    const w = 240
    const step = w + gap
    for (let width = 340; width <= 2560; width += 37) {
      const shift = getMidSnapShift(width, w, gap, 0.25)
      const hidden = (((step - shift) % step) + step) % step
      const visibleLeft = w - hidden
      const visibleRight = (hidden + width) % step
      expect(Math.abs(visibleLeft - visibleRight), `width ${width}`).toBeLessThanOrEqual(1)
    }
  })

  it('mid peek stays within half an item of the peekRatio target where geometry allows', () => {
    // 1280: achievable symmetric peek 44 vs target 45
    const shift = getMidSnapShift(1280, 180, gap, 0.25)
    const step = 196
    const hidden = (((step - shift) % step) + step) % step
    expect(180 - hidden).toBe(44)
  })
})

describe('shouldReinitCarousel', () => {
  function entryFor(el: Element): ResizeObserverEntry {
    return { target: el } as unknown as ResizeObserverEntry
  }

  it('ignores slide resizes so expansion never re-measures Embla mid-transition', () => {
    const slide = document.createElement('div')
    slide.setAttribute('data-slot', 'carousel-item')
    expect(shouldReinitCarousel([entryFor(slide)])).toBe(false)
  })

  it('re-measures when the viewport container resizes', () => {
    const slide = document.createElement('div')
    const viewport = document.createElement('div')
    viewport.setAttribute('data-slot', 'carousel-content')
    expect(shouldReinitCarousel([entryFor(slide), entryFor(viewport)])).toBe(true)
  })

  it('returns false with no entries', () => {
    expect(shouldReinitCarousel([])).toBe(false)
  })
})

describe('resolveContentGutter', () => {
  it('returns the base gutter on narrow viewports', () => {
    expect(resolveContentGutter(320, 1680, 24)).toBe(24)
    expect(resolveContentGutter(1280, 1680, 24)).toBe(24)
  })

  it('returns the base gutter exactly at max content width', () => {
    expect(resolveContentGutter(1680, 1680, 24)).toBe(24)
  })

  it('grows past max content width to center the row', () => {
    expect(resolveContentGutter(1920, 1680, 24)).toBe(144)
    expect(resolveContentGutter(2000, 1680, 24)).toBe(184)
  })
})

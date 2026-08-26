import { describe, expect, it } from 'vitest'
import {
  BROWSE_CAROUSEL_BREAKPOINTS,
  calculatePeekWidth,
  getBrowseVisibleCount,
  getCarouselState,
  getMidSnapShift,
  getScrollAmount,
  getVisibleCount,
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

describe('getCarouselState', () => {
  it('returns single when content fits without scroll', () => {
    expect(getCarouselState(0, 1280, 1000)).toBe('single')
    expect(getCarouselState(0, 500, 500)).toBe('single')
  })

  it('returns atStart when at left edge', () => {
    expect(getCarouselState(0, 500, 1200)).toBe('atStart')
    expect(getCarouselState(1, 500, 1200, 2)).toBe('atStart')
  })

  it('returns atEnd when at right edge', () => {
    // scrollLeft + clientWidth == scrollWidth
    expect(getCarouselState(700, 500, 1200)).toBe('atEnd')
    // with tolerance
    expect(getCarouselState(698, 500, 1200, 5)).toBe('atEnd')
  })

  it('returns atMid when in middle', () => {
    expect(getCarouselState(300, 500, 1200)).toBe('atMid')
    expect(getCarouselState(100, 500, 1200)).toBe('atMid')
  })

  it('tolerates threshold for atStart/atEnd', () => {
    expect(getCarouselState(2, 500, 1200, 2)).toBe('atStart')
    expect(getCarouselState(3, 500, 1200, 2)).toBe('atMid')
  })
})

describe('browse carousel breakpoints', () => {
  it('has expected breakpoint table', () => {
    expect(BROWSE_CAROUSEL_BREAKPOINTS).toEqual([
      { maxWidth: 447, count: 1 },
      { maxWidth: 679, count: 2 },
      { maxWidth: 879, count: 3 },
      { maxWidth: 1399, count: 4 },
      { maxWidth: 1799, count: 5 },
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

  it('returns 4 for 880-1399', () => {
    expect(getBrowseVisibleCount(880)).toBe(4)
    expect(getBrowseVisibleCount(1280)).toBe(4)
    expect(getBrowseVisibleCount(1399)).toBe(4)
  })

  it('returns 5 for 1400-1799', () => {
    expect(getBrowseVisibleCount(1400)).toBe(5)
    expect(getBrowseVisibleCount(1500)).toBe(5)
    expect(getBrowseVisibleCount(1799)).toBe(5)
  })

  it('returns 6 for >1799', () => {
    expect(getBrowseVisibleCount(1800)).toBe(6)
    expect(getBrowseVisibleCount(1920)).toBe(6)
    expect(getBrowseVisibleCount(2500)).toBe(6)
  })

  it('returns at least 1 for narrow or invalid width', () => {
    expect(getBrowseVisibleCount(-10)).toBe(1)
    expect(getBrowseVisibleCount(100)).toBe(1)
  })
})

describe('getVisibleCount', () => {
  const itemWidth = 240
  const gap = 16
  const peek = 60

  it('aliases getBrowseVisibleCount regardless of other params', () => {
    expect(getVisibleCount(1280, itemWidth, gap, peek, 'atStart')).toBe(4)
    expect(getVisibleCount(1280, itemWidth, gap, peek, 'atMid')).toBe(4)
    expect(getVisibleCount(1280, itemWidth, gap, peek, 'atEnd')).toBe(4)
    expect(getVisibleCount(1280, itemWidth, gap, peek, 'single')).toBe(4)
  })

  it('maps viewport table for various widths', () => {
    expect(getVisibleCount(400, itemWidth, gap, peek, 'atStart')).toBe(1)
    expect(getVisibleCount(500, itemWidth, gap, peek, 'atMid')).toBe(2)
    expect(getVisibleCount(700, itemWidth, gap, peek, 'atMid')).toBe(3)
    expect(getVisibleCount(1500, itemWidth, gap, peek, 'atEnd')).toBe(5)
    expect(getVisibleCount(1920, itemWidth, gap, peek, 'atStart')).toBe(6)
  })

  it('returns at least 1 for narrow viewport', () => {
    expect(getVisibleCount(100, itemWidth, gap, peek, 'atStart')).toBe(1)
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

  it('mid peek stays within half an item of the peekRatio target where geometry allows', () => {
    // 1280: achievable symmetric peek 44 vs target 45
    const shift = getMidSnapShift(1280, 180, gap, 0.25)
    const step = 196
    const hidden = (((step - shift) % step) + step) % step
    expect(180 - hidden).toBe(44)
  })
})

describe('getScrollAmount', () => {
  const itemWidth = 180
  const gap = 16
  const peek = 45

  it('returns visibleCount * (itemWidth+gap) via table', () => {
    // 1280 => 4 => 4*196=784
    expect(getScrollAmount(1280, itemWidth, gap, peek, 'atStart')).toBe(784)
    // 700 => 3 => 3*196=588
    expect(getScrollAmount(700, itemWidth, gap, peek, 'atMid')).toBe(588)
    // 500 => 2 => 392
    expect(getScrollAmount(500, itemWidth, gap, peek, 'atEnd')).toBe(392)
    // 1920 => 6 => 1176
    expect(getScrollAmount(1920, itemWidth, gap, peek, 'single')).toBe(1176)
  })

  it('ignores peek and state, depends only on viewport width', () => {
    expect(getScrollAmount(1280, itemWidth, gap, peek, 'atStart')).toBe(
      getScrollAmount(1280, itemWidth, gap, peek, 'single'),
    )
    expect(getScrollAmount(700, itemWidth, gap, peek, 'atMid')).toBe(
      getScrollAmount(700, itemWidth, gap, 0, 'single'),
    )
  })
})

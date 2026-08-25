import { describe, expect, it } from 'vitest'
import {
  calculatePeekWidth,
  getCarouselState,
  getScrollAmount,
  getVisibleCount,
} from './use-prime-carousel'

describe('calculatePeekWidth', () => {
  it('returns 1/4 of item width by default', () => {
    expect(calculatePeekWidth(240, 0.25)).toBe(60)
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

describe('getVisibleCount', () => {
  const itemWidth = 240
  const gap = 16
  const peek = 60

  it('computes visible count for atStart (one peek)', () => {
    // viewport 1280 -> available = 1280 -60 -16 =1204, (1204+16)/256=4.76 =>4
    expect(getVisibleCount(1280, itemWidth, gap, peek, 'atStart')).toBe(4)
    expect(getVisibleCount(1232, itemWidth, gap, peek, 'atStart')).toBe(4)
  })

  it('computes visible count for atMid (two peeks)', () => {
    // atMid: available = CW -2*peek -2*gap
    expect(getVisibleCount(1280, itemWidth, gap, peek, 'atMid')).toBe(4)
    // narrow viewport 700 -> atMid available 700-120-32=548 => 2
    expect(getVisibleCount(700, itemWidth, gap, peek, 'atMid')).toBe(2)
  })

  it('computes visible count for atEnd (one peek)', () => {
    expect(getVisibleCount(1280, itemWidth, gap, peek, 'atEnd')).toBe(4)
  })

  it('returns at least 1', () => {
    expect(getVisibleCount(100, itemWidth, gap, peek, 'atStart')).toBe(1)
  })

  it('handles single (no peek) correctly', () => {
    expect(getVisibleCount(1280, itemWidth, gap, peek, 'single')).toBe(5)
  })
})

describe('getScrollAmount', () => {
  const itemWidth = 240
  const gap = 16
  const peek = 60

  it('returns visibleCount * (itemWidth+gap)', () => {
    // atStart 1280 => visible 4 => 4*256=1024
    expect(getScrollAmount(1280, itemWidth, gap, peek, 'atStart')).toBe(1024)
    expect(getScrollAmount(700, itemWidth, gap, peek, 'atMid')).toBe(512)
  })
})

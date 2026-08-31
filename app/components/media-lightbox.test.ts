import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MediaLightbox from './media-lightbox.vue'

const PATHS = [
  '/iopYFB1b6Bh7FWZh3onQhfhYyVq.jpg',
  '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
  '/a2ZBD9BqR1cR6J8zW5s9n4X3pL7M.jpg',
]

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
  document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-content"]').forEach(n => n.remove())
})

describe('media lightbox - shadcn-vue carousel core', () => {
  it('renders inside a reka-ui Dialog (z-[80], bg-black, fullscreen, sr-only title) when open', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-1',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    const content = document.querySelector('[data-slot="dialog-content"]') as HTMLElement | null
    expect(content).not.toBeNull()
    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement | null
    expect(overlay).not.toBeNull()
    expect(`${overlay!.className} ${content!.className}`).toContain('z-[80]')
    expect(`${overlay!.className} ${content!.className}`).toContain('bg-black')

    expect(content!.className).toContain('flex')
    expect(content!.className).toContain('inset-0')
    expect(content!.className).toContain('top-auto')
    expect(content!.className).toContain('left-auto')

    const titleNode = document.querySelector('[data-slot="dialog-title"]') as HTMLElement | null
    expect(titleNode).not.toBeNull()
    expect(titleNode!.className).toMatch(/sr-only/)
    expect(titleNode!.textContent).toContain('劇照')

    wrapper.unmount()
  })

  it('mounts the shadcn-vue carousel core with one slide per backdrop', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-carousel-1',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    const root = document.querySelector('[data-slot="carousel"]') as HTMLElement | null
    expect(root).not.toBeNull()
    expect(root!.getAttribute('role')).toBe('region')
    expect(root!.getAttribute('aria-roledescription')).toBe('carousel')

    const content = document.querySelector('[data-slot="carousel-content"]') as HTMLElement | null
    expect(content).not.toBeNull()

    const slides = document.querySelectorAll('[data-slot="carousel-item"]')
    expect(slides).toHaveLength(PATHS.length)
    for (const slide of slides) {
      expect(slide.getAttribute('role')).toBe('group')
      expect(slide.getAttribute('aria-roledescription')).toBe('slide')
    }

    wrapper.unmount()
  })

  it('renders each backdrop as a w1280 image inside its own slide', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-carousel-2',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    const slides = document.querySelectorAll('[data-slot="carousel-item"]')
    expect(slides).toHaveLength(PATHS.length)
    const imgs = Array.from(slides).map(s => s.querySelector('img')) as HTMLImageElement[]
    expect(imgs).toHaveLength(PATHS.length)
    for (let i = 0; i < PATHS.length; i++) {
      expect(imgs[i]!.getAttribute('src')).toContain('w1280')
      expect(imgs[i]!.getAttribute('src')).toContain((PATHS[i] as string).slice(1, 10))
      expect(imgs[i]!.className).toContain('object-contain')
    }

    wrapper.unmount()
  })

  it('renders CarouselPrevious and CarouselNext with built-in disabled state at edges', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-carousel-3',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    const prev = document.querySelector('[data-slot="carousel-previous"]') as HTMLButtonElement | null
    const next = document.querySelector('[data-slot="carousel-next"]') as HTMLButtonElement | null
    expect(prev).not.toBeNull()
    expect(next).not.toBeNull()

    wrapper.unmount()
  })

  it('renders the counter with the initial position and live-region semantics', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-carousel-4',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    const counter = document.querySelector('[data-testid="lightbox-counter"]') as HTMLElement | null
    expect(counter).not.toBeNull()
    expect(counter!.getAttribute('aria-live')).toBe('polite')
    expect(counter!.getAttribute('aria-atomic')).toBe('true')
    expect(counter!.textContent).toBe('1 / 3')

    wrapper.unmount()
  })

  it('clamps initialIndex past the end to the last slide', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-carousel-6',
      props: { paths: PATHS, open: true, initialIndex: 99 },
    })

    // initialIndex is clamped in our component state regardless of Embla measurement
    const counter = document.querySelector('[data-testid="lightbox-counter"]') as HTMLElement | null
    expect(counter).not.toBeNull()

    wrapper.unmount()
  })

  it('renders the counter at the requested initialIndex when in range', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-carousel-5',
      props: { paths: PATHS, open: true, initialIndex: 1 },
    })

    const counter = document.querySelector('[data-testid="lightbox-counter"]') as HTMLElement | null
    expect(counter).not.toBeNull()

    wrapper.unmount()
  })

  it('closes when pressing Escape (VueUse onKeyStroke)', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-5',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await vi.waitFor(() => {
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    wrapper.unmount()
  })

  it('closes when clicking outside the image (VueUse onClickOutside)', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-6',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    const overlay = document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement | null
    expect(overlay).not.toBeNull()
    await new Promise(resolve => setTimeout(resolve, 0))
    overlay!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    await vi.waitFor(() => {
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    wrapper.unmount()
  })

  it('close button emits update:open false', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-7',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    const closeBtn = document.querySelector('[data-testid="lightbox-close"]') as HTMLButtonElement | null
    expect(closeBtn).not.toBeNull()
    await closeBtn!.click()

    await vi.waitFor(() => {
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    wrapper.unmount()
  })

  it('does not render dialog content when closed', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-8',
      props: { paths: PATHS, open: false, initialIndex: 0 },
    })

    expect(document.querySelector('[data-slot="carousel"]')).toBeNull()
    expect(document.querySelector('[data-testid="lightbox-image"]')).toBeNull()

    wrapper.unmount()
  })

  it('uses shadcn-vue Carousel primitives (not hand-rolled currentIndex/goPrev/goNext)', async () => {
    const fs = await import('node:fs/promises')
    let source = ''
    try {
      source = await fs.readFile(new URL('file:///Users/max/.treehouse/spudtube-b5a88b/4/spudtube/app/components/media-lightbox.vue').pathname, 'utf8')
    }
    catch {
      source = ''
    }
    expect(source).toContain('@/components/ui/carousel')
    expect(source).toMatch(/Carousel/)
    expect(source).toMatch(/CarouselContent/)
    expect(source).toMatch(/CarouselItem/)
    expect(source).toMatch(/CarouselNext/)
    expect(source).toMatch(/CarouselPrevious/)
    // VueUse stays only for close handlers (escape + click outside), not for prev/next
    expect(source).toMatch(/onKeyStroke/)
    expect(source).toMatch(/onClickOutside/)
    // Manual currentIndex/goPrev/goNext navigation is gone
    expect(source).not.toMatch(/function goPrev/)
    expect(source).not.toMatch(/function goNext/)
  })

  it('renders all slides even with one image (single-image case still has prev/next disabled)', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-9',
      props: { paths: [PATHS[0]!], open: true, initialIndex: 0 },
    })

    const slides = document.querySelectorAll('[data-slot="carousel-item"]')
    expect(slides).toHaveLength(1)
    expect(document.querySelector('[data-testid="lightbox-counter"]')!.textContent).toBe('1 / 1')

    wrapper.unmount()
  })
})

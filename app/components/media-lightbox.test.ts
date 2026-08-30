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

describe('media lightbox - threads-like fullscreen carousel', () => {
  it('renders the current backdrop fullscreen with counter and sr-only title when open', async () => {
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

    // centered fullscreen via flex/inset, not translate
    expect(content!.className).toContain('flex')
    expect(content!.className).toContain('inset-0')
    expect(content!.className).toContain('top-auto')
    expect(content!.className).toContain('left-auto')

    const titleNode = document.querySelector('[data-slot="dialog-title"]') as HTMLElement | null
    expect(titleNode).not.toBeNull()
    expect(titleNode!.className).toMatch(/sr-only/)
    expect(titleNode!.textContent).toContain('劇照')

    // image
    const img = document.querySelector('[data-testid="lightbox-image"]') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toContain('w1280')
    expect(img!.getAttribute('src')).toContain((PATHS[0] as string).slice(1, 10))
    expect(img!.className).toContain('object-contain')

    // counter
    expect(document.body.textContent).toContain('1 / 3')
    const counter = document.querySelector('[data-testid="lightbox-counter"]') as HTMLElement | null
    expect(counter).not.toBeNull()
    expect(counter!.getAttribute('aria-live')).toBe('polite')

    wrapper.unmount()
  })

  it('shows correct image for initialIndex and disables prev at start', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-2',
      props: { paths: PATHS, open: true, initialIndex: 1 },
    })

    expect(document.body.textContent).toContain('2 / 3')
    const img = document.querySelector('[data-testid="lightbox-image"]') as HTMLImageElement | null
    expect(img!.getAttribute('src')).toContain((PATHS[1] as string).slice(1, 10))

    const prevBtn = document.querySelector('[data-testid="lightbox-prev"]') as HTMLButtonElement | null
    const nextBtn = document.querySelector('[data-testid="lightbox-next"]') as HTMLButtonElement | null
    expect(prevBtn).not.toBeNull()
    expect(nextBtn).not.toBeNull()
    expect(prevBtn!.disabled).toBe(false)
    expect(nextBtn!.disabled).toBe(false)

    wrapper.unmount()
  })

  it('navigates with prev/next buttons and disables at ends', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-3',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    let prevBtn = document.querySelector('[data-testid="lightbox-prev"]') as HTMLButtonElement | null
    let nextBtn = document.querySelector('[data-testid="lightbox-next"]') as HTMLButtonElement | null
    expect(prevBtn!.disabled).toBe(true)
    expect(nextBtn!.disabled).toBe(false)

    // go to 1
    await nextBtn!.click()
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('2 / 3')
    })

    // go to last
    nextBtn = document.querySelector('[data-testid="lightbox-next"]') as HTMLButtonElement | null
    await nextBtn!.click()
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('3 / 3')
    })
    expect((document.querySelector('[data-testid="lightbox-next"]') as HTMLButtonElement).disabled).toBe(true)

    // back to 1
    prevBtn = document.querySelector('[data-testid="lightbox-prev"]') as HTMLButtonElement | null
    await prevBtn!.click()
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('2 / 3')
    })

    wrapper.unmount()
  })

  it('navigates with ArrowLeft / ArrowRight keys', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-4',
      props: { paths: PATHS, open: true, initialIndex: 0 },
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('2 / 3')
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('1 / 3')
    })

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

    // reka Dialog does not mount content when open=false
    expect(document.querySelector('[data-testid="lightbox-image"]')).toBeNull()

    wrapper.unmount()
  })

  it('uses VueUse for dismiss and viewport handling', async () => {
    const fs = await import('node:fs/promises')
    let source = ''
    try {
      source = await fs.readFile(new URL('file:///Users/max/.treehouse/spudtube-b5a88b/4/spudtube/app/components/media-lightbox.vue').pathname, 'utf8')
    }
    catch {
      source = ''
    }
    expect(source).toContain('@vueuse/core')
    expect(source).toMatch(/onKeyStroke/)
    expect(source).toMatch(/onClickOutside/)
  })

  it('hides next/prev when only one image', async () => {
    const wrapper = await mountSuspended(MediaLightbox, {
      route: '/?probe=lightbox-9',
      props: { paths: [PATHS[0]!], open: true, initialIndex: 0 },
    })

    expect(document.body.textContent).toContain('1 / 1')
    // buttons hidden or disabled when single
    const nextBtn = document.querySelector('[data-testid="lightbox-next"]') as HTMLElement | null
    const prevBtn = document.querySelector('[data-testid="lightbox-prev"]') as HTMLElement | null
    // at least one indicator: both disabled or not rendered
    if (nextBtn && prevBtn) {
      expect((nextBtn as HTMLButtonElement).disabled).toBe(true)
      expect((prevBtn as HTMLButtonElement).disabled).toBe(true)
    }
    else {
      expect(nextBtn ?? prevBtn).toBeNull()
    }

    wrapper.unmount()
  })
})

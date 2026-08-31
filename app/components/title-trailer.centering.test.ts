import { join } from 'node:path'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import TitleTrailer from './title-trailer.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
  document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-content"]').forEach(n => n.remove())
})

describe('title trailer centering (responsive)', () => {
  it('centers the dialog content in the viewport with flex/inset, not just translate', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=centering-1',
      props: { open: true, trailerKey: 'abc123' },
    })

    const content = document.querySelector('[data-slot="dialog-content"]') as HTMLElement | null
    expect(content).not.toBeNull()

    // Fix must override the shadcn translate-center with a true viewport flex center.
    // This is responsive-safe: flex centering does not drift when viewport or scrollbar changes.
    expect(content!.className).toContain('flex')
    expect(content!.className).toContain('items-center')
    expect(content!.className).toContain('justify-center')
    expect(content!.className).toContain('inset-0')
    // Overridden translate/position should be reset to allow flex centering to win
    expect(content!.className).toContain('top-auto')
    expect(content!.className).toContain('left-auto')
    expect(content!.className).toContain('translate-x-0')
    expect(content!.className).toContain('translate-y-0')

    // Responsive: video container must be bounded by both axes and centered
    const videoBox = document.querySelector('[data-slot="dialog-content"] > div.relative, [data-slot="dialog-content"] > div[data-testid="trailer-box"]') as HTMLElement | null
    expect(videoBox).not.toBeNull()
    // should be centered inside the flex container (mx-auto or w-full with max-width)
    // and have a responsive width that respects both viewport width and height (16:9)
    const hasResponsiveClass = videoBox!.className.includes('w-[min(') || videoBox!.className.includes('max-w-[')
    const hasInlineResponsiveStyle = videoBox!.style.width !== '' || videoBox!.getAttribute('style')?.includes('width') === true
    expect(hasResponsiveClass || hasInlineResponsiveStyle).toBe(true)

    wrapper.unmount()
  })

  it('keeps video centered after viewport resize (VueUse useWindowSize reactive)', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=centering-2',
      props: { open: true, trailerKey: 'abc123' },
    })

    const content = document.querySelector('[data-slot="dialog-content"]') as HTMLElement | null
    expect(content).not.toBeNull()

    // Simulate responsive change: window resize must not break centering classes
    const originalW = window.innerWidth
    const originalH = window.innerHeight

    // shrink to mobile width
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 812 })
    window.dispatchEvent(new Event('resize'))
    await new Promise(r => setTimeout(r, 50))

    // still centered via flex/inset
    const afterResize = document.querySelector('[data-slot="dialog-content"]') as HTMLElement | null
    expect(afterResize).not.toBeNull()
    expect(afterResize!.className).toContain('flex')
    expect(afterResize!.className).toContain('items-center')
    expect(afterResize!.className).toContain('justify-center')
    expect(afterResize!.className).toContain('inset-0')

    // video box still centered (mx-auto inside flex) and bounded
    const videoBox = document.querySelector('[data-slot="dialog-content"] > div.relative, [data-slot="dialog-content"] > div[data-testid="trailer-box"]') as HTMLElement | null
    expect(videoBox).not.toBeNull()
    // should still be in document and centered (flex parent handles centering, mx-auto is secondary guarantee)
    expect(document.body.contains(videoBox!)).toBe(true)

    // restore
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalW })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalH })
    window.dispatchEvent(new Event('resize'))

    wrapper.unmount()
  })

  it('uses VueUse for responsive viewport tracking (useWindowSize import)', async () => {
    // Cheap seam check: the fix should import a VueUse composable for responsive behavior
    // rather than hard-coding CSS only. We assert the component source contains vueuse.
    const fs = await import('node:fs/promises')
    // Fallback read via file system path resolved differently in happy-dom; try direct path
    let source = ''
    try {
      source = await fs.readFile(join(process.cwd(), 'app/components/title-trailer.vue'), 'utf8')
    }
    catch {
      source = ''
    }
    expect(source).toContain('@vueuse/core')
    expect(source).toMatch(/useWindowSize|useBreakpoints|useElementBounding|useMediaQuery/)
  })
})

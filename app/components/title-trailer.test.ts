import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TitleTrailer from './title-trailer.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
  // drop any leftover dialog portals so tests stay isolated
  document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-content"]')
    .forEach(node => node.remove())
})

describe('title trailer overlay', () => {
  it('plays an autoplaying YouTube iframe on a bare overlay when open', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=1',
      props: { open: true, trailerKey: 'abc123' },
    })

    const content = document.querySelector('[data-slot="dialog-content"]')
    expect(content).not.toBeNull()
    // lightbox chrome is stripped: transparent surface, no border, no shadow
    expect(content!.className).toContain('bg-transparent')
    expect(content!.className).toContain('border-0')
    expect(content!.className).toContain('shadow-none')

    // pure black backdrop and no close button chrome
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    expect(overlay).not.toBeNull()
    expect(overlay!.className).toContain('bg-black')
    expect(document.querySelector('[data-slot="dialog-close"]')).toBeNull()

    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe!.getAttribute('src')).toContain('youtube-nocookie.com/embed/abc123')
    expect(iframe!.getAttribute('src')).toContain('autoplay=1')

    // accessible name survives without a visible header
    const title = document.querySelector('[data-slot="dialog-title"]')
    expect(title?.textContent).toContain('預告片')

    // responsive width keeps 16:9 inside both viewport axes
    const videoBox = document.querySelector('[data-slot="dialog-content"] > div.relative')
    expect(videoBox).not.toBeNull()
    expect(videoBox!.className).toContain('w-[min(1120px')

    wrapper.unmount()
  })

  it('renders nothing when closed', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=2',
      props: { open: false, trailerKey: 'abc123' },
    })

    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()

    wrapper.unmount()
  })

  it('emits update:open false when Escape is pressed', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=3',
      props: { open: true, trailerKey: 'xyz' },
    })

    // reka registers escape via onKeyStroke on window
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    await vi.waitFor(() => {
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    wrapper.unmount()
  })

  it('emits update:open false when clicking outside the video', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=5',
      props: { open: true, trailerKey: 'xyz' },
    })

    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    expect(overlay).not.toBeNull()
    // reka defers its outside-pointerdown listener by one macrotask
    await new Promise(resolve => setTimeout(resolve, 0))
    overlay!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    await vi.waitFor(() => {
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    wrapper.unmount()
  })

  it('renders no iframe when there is no trailer key', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=4',
      props: { open: true, trailerKey: null },
    })

    expect(document.querySelector('iframe')).toBeNull()

    wrapper.unmount()
  })
})

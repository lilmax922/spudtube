import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TitleTrailer from './title-trailer.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('title trailer modal', () => {
  it('renders an autoplaying YouTube iframe in a modal when open', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=1',
      props: { open: true, trailerKey: 'abc123' },
    })

    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe!.getAttribute('src')).toContain('youtube-nocookie.com/embed/abc123')
    expect(iframe!.getAttribute('src')).toContain('autoplay=1')
    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
    expect(document.body.textContent).toContain('預告片')

    wrapper.unmount()
  })

  it('renders nothing when closed', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=2',
      props: { open: false, trailerKey: 'abc123' },
    })

    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()
    expect(document.body.textContent).not.toContain('預告片')

    wrapper.unmount()
  })

  it('emits update:open false when the close button is clicked', async () => {
    const wrapper = await mountSuspended(TitleTrailer, {
      route: '/?probe=3',
      props: { open: true, trailerKey: 'xyz' },
    })

    const closeButton = document.querySelector<HTMLButtonElement>('[data-slot="dialog-close-button"]')
    expect(closeButton).not.toBeNull()
    expect(closeButton!.getAttribute('aria-label')).toBe('關閉')
    closeButton!.click()

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

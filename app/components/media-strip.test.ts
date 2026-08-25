import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MediaStrip from './media-strip.vue'

const PATHS = [
  '/iopYFB1b6Bh7FWZh3onQhfhYyVq.jpg',
  '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
]

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('media strip', () => {
  it('renders a backdrop grid using the w1280 image size', async () => {
    const wrapper = await mountSuspended(MediaStrip, { route: '/?probe=1', props: { paths: PATHS } })

    expect(wrapper.text()).toContain('劇照')
    const imgs = wrapper.findAll('img').map(img => img.attributes('src'))
    expect(imgs).toContain('https://image.tmdb.org/t/p/w1280/iopYFB1b6Bh7FWZh3onQhfhYyVq.jpg')
    expect(imgs).toContain('https://image.tmdb.org/t/p/w1280/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg')
  })

  it('caps visible backdrops at six', async () => {
    const longPaths = Array.from({ length: 12 }, (_, i) => `/path-${i}.jpg`)
    const wrapper = await mountSuspended(MediaStrip, { route: '/?probe=2', props: { paths: longPaths } })

    expect(wrapper.findAll('img')).toHaveLength(6)
  })

  it('renders the empty state when no backdrops are available', async () => {
    const wrapper = await mountSuspended(MediaStrip, { route: '/?probe=3', props: { paths: [] } })

    expect(wrapper.text()).toContain('尚未提供劇照')
    expect(wrapper.findAll('img')).toHaveLength(0)
  })
})

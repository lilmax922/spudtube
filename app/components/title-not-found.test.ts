import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import TitleNotFound from './title-not-found.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('title not found', () => {
  it('renders localized not-found copy with a back-home link', async () => {
    const wrapper = await mountSuspended(TitleNotFound, { route: '/?probe=1' })

    expect(wrapper.text()).toContain('找不到這部作品')
    expect(wrapper.text()).toContain('它可能已從目錄中移除')
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/')
    expect(link.text()).toContain('回到首頁')
  })

  it('uses extrabold hero tracking and body at 14/400/1.7', async () => {
    const wrapper = await mountSuspended(TitleNotFound, { route: '/?probe=2' })

    const heading = wrapper.find('h1')
    expect(heading.classes().join(' ')).toContain('font-extrabold')
    expect(heading.classes().join(' ')).toContain('tracking-')

    const body = wrapper.find('p')
    expect(body.classes().join(' ')).toContain('font-normal')
    expect(body.classes().join(' ')).toContain('leading-[1.7]')
  })
})

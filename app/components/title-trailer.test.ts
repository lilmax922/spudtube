import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import TitleTrailer from './title-trailer.vue'

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('title trailer', () => {
  it('embeds the YouTube iframe when a trailer key exists', async () => {
    const wrapper = await mountSuspended(TitleTrailer, { route: '/?probe=1', props: { trailerKey: 'abc123' } })

    const iframe = wrapper.find('iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toContain('abc123')
    expect(wrapper.text()).toContain('預告片')
  })

  it('renders nothing when there is no trailer', async () => {
    const wrapper = await mountSuspended(TitleTrailer, { route: '/?probe=2', props: { trailerKey: null } })

    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})

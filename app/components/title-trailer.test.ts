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

  it('uses card surface tokens with tight heading tracking and cleanly disappears', async () => {
    const withTrailer = await mountSuspended(TitleTrailer, { route: '/?probe=3', props: { trailerKey: 'xyz' } })

    const section = withTrailer.find('section')
    expect(section.exists()).toBe(true)
    expect(section.classes().join(' ')).toContain('bg-card')
    expect(section.classes().join(' ')).toContain('rounded-lg')
    expect(section.classes().join(' ')).toContain('shadow-')

    const heading = withTrailer.find('h2')
    expect(heading.classes().join(' ')).toContain('font-bold')
    expect(heading.classes().join(' ')).toContain('tracking-tight')

    const withoutTrailer = await mountSuspended(TitleTrailer, { route: '/?probe=4', props: { trailerKey: null } })
    expect(withoutTrailer.find('section').exists()).toBe(false)
    expect(withoutTrailer.find('iframe').exists()).toBe(false)
  })
})

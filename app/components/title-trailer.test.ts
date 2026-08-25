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

  it('uses detailSection divider and prototype heading and cleanly disappears', async () => {
    const withTrailer = await mountSuspended(TitleTrailer, { route: '/?probe=3', props: { trailerKey: 'xyz' } })

    const section = withTrailer.find('section')
    expect(section.exists()).toBe(true)
    // prototype detailSection uses border-t divider, not bg-card surface
    expect(section.classes().join(' ')).toContain('border-t')
    expect(section.classes().join(' ')).toContain('border-border')
    // iframe container retains shadow for depth, but outer section is flat
    const iframeWrap = withTrailer.find('div.aspect-video')
    expect(iframeWrap.classes().join(' ')).toContain('rounded-lg')
    expect(iframeWrap.classes().join(' ')).toContain('bg-black')

    const heading = withTrailer.find('h2')
    expect(heading.classes().join(' ')).toContain('font-bold')
    expect(heading.classes().join(' ')).toContain('uppercase')
    expect(heading.classes().join(' ')).toContain('text-muted-foreground')

    const withoutTrailer = await mountSuspended(TitleTrailer, { route: '/?probe=4', props: { trailerKey: null } })
    expect(withoutTrailer.find('section').exists()).toBe(false)
    expect(withoutTrailer.find('iframe').exists()).toBe(false)
  })
})

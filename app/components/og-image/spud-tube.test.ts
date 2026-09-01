import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SpudTubeOgImage from '../OgImage/SpudTube.takumi.vue'

describe('ogImage SpudTube', () => {
  it('renders title text', async () => {
    const wrapper = mount(SpudTubeOgImage, { props: { title: 'Dune', year: '2021' } })
    expect(wrapper.text()).toContain('Dune')
  })

  it('renders year alongside title when provided', async () => {
    const wrapper = mount(SpudTubeOgImage, { props: { title: '沙丘', year: '2021' } })
    expect(wrapper.text()).toContain('2021')
    expect(wrapper.text()).toContain('沙丘')
  })

  it('renders description when provided', async () => {
    const wrapper = mount(SpudTubeOgImage, { props: { title: 'Dune', description: 'Epic sci-fi', year: '2021' } })
    expect(wrapper.text()).toContain('Epic sci-fi')
  })

  it('uses dark background token oklch(0.105 0.012 275) and foreground oklch(0.96 0.008 280)', async () => {
    const wrapper = mount(SpudTubeOgImage, { props: { title: 'Dune' } })
    const html = wrapper.html()
    expect(html).toContain('oklch(0.105 0.012 275)')
    expect(html).toContain('oklch(0.96 0.008 280)')
  })

  it('has 1200x630 dimensions', async () => {
    const wrapper = mount(SpudTubeOgImage, { props: { title: 'Dune' } })
    const html = wrapper.html()
    expect(html).toContain('width: 1200px')
    expect(html).toContain('height: 630px')
    expect(html).toContain('1200px')
    expect(html).toContain('630px')
  })

  it('does not render logo image', async () => {
    const wrapper = mount(SpudTubeOgImage, { props: { title: 'Dune' } })
    const images = wrapper.findAll('img')
    // should have no img with logo alt, or no img at all except maybe decorative
    const logoImages = images.filter((img) => {
      const alt = img.attributes('alt') ?? ''
      const src = img.attributes('src') ?? ''
      return alt.toLowerCase().includes('logo') || src.toLowerCase().includes('logo')
    })
    expect(logoImages.length).toBe(0)
  })

  it('renders SpudTube wordmark', async () => {
    const wrapper = mount(SpudTubeOgImage, { props: { title: 'Dune' } })
    expect(wrapper.text()).toContain('SpudTube')
  })

  it('updates reactively when title/locale changes', async () => {
    const wrapper = mount(SpudTubeOgImage, { props: { title: 'Dune', description: 'EN desc', year: '2021' } })
    expect(wrapper.text()).toContain('Dune')
    expect(wrapper.text()).toContain('EN desc')
    await wrapper.setProps({ title: '沙丘', description: '繁體中文描述', year: '2021' })
    expect(wrapper.text()).toContain('沙丘')
    expect(wrapper.text()).toContain('繁體中文描述')
    expect(wrapper.text()).not.toContain('Dune')
    // tokens and dimensions remain exact after prop change
    const html = wrapper.html()
    expect(html).toContain('oklch(0.105 0.012 275)')
    expect(html).toContain('oklch(0.96 0.008 280)')
    expect(html).toContain('width: 1200px')
    expect(html).toContain('height: 630px')
  })
})

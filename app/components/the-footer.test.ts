import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/en.json'
import zhTw from '../../i18n/locales/zh-TW.json'
import TheFooter from './the-footer.vue'

function mountFooter(locale: 'en' | 'zh-TW') {
  const i18n = createI18n({
    legacy: false,
    locale,
    messages: { en, 'zh-TW': zhTw },
  })
  return mount(TheFooter, {
    global: { plugins: [i18n] },
  })
}

describe('the-footer', () => {
  it('renders TMDB and JustWatch attribution', () => {
    const wrapper = mountFooter('en')
    expect(wrapper.text()).toContain('TMDB')
    expect(wrapper.text()).toContain('JustWatch')
  })

  it('renders localized attribution for zh-TW', () => {
    const wrapper = mountFooter('zh-TW')
    expect(wrapper.text()).toContain('TMDB')
    expect(wrapper.text()).toContain('JustWatch')
  })

  it('renders as a footer landmark', () => {
    const wrapper = mountFooter('en')
    expect(wrapper.find('footer').exists()).toBe(true)
  })
})

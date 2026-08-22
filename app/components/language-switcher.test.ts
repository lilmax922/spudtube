import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../app.vue'
import LanguageSwitcher from './language-switcher.vue'

function findButton(wrapper: VueWrapper<unknown>, label: string): DOMWrapper<Element> | undefined {
  return wrapper.findAll('button').find(button => button.text() === label)
}

function writeLocaleCookie(value: string): void {
  document.cookie = `spudtube-locale=${value}; Path=/`
}

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('language switcher', () => {
  it('renders a control per configured locale', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)
    const labels = wrapper.findAll('button').map(button => button.text())

    expect(labels).toEqual(['繁體中文', 'English'])
  })

  it('marks the persisted locale as active', async () => {
    writeLocaleCookie('zh-TW')
    const wrapper = await mountSuspended(LanguageSwitcher)

    const chinese = findButton(wrapper, '繁體中文')!
    const english = findButton(wrapper, 'English')!
    expect(chinese.attributes('aria-pressed')).toBe('true')
    expect(english.attributes('aria-pressed')).toBe('false')
  })

  it('switches language instantly and persists the choice', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)

    await findButton(wrapper, '繁體中文')!.trigger('click')
    await flushPromises()

    expect(findButton(wrapper, '繁體中文')!.attributes('aria-pressed')).toBe('true')
    expect(document.cookie).toContain('spudtube-locale=zh-TW')
  })
})

describe('display locale resolution through the app shell', () => {
  it('falls back to en without any country signal', async () => {
    const wrapper = await mountSuspended(App)

    expect(wrapper.text()).toContain('Decide what to watch')
  })

  it('honors the persisted choice over the resolved default', async () => {
    writeLocaleCookie('zh-TW')
    const wrapper = await mountSuspended(App)

    expect(wrapper.text()).toContain('決定接下來看什麼')
  })

  it('re-renders scaffold strings without reload', async () => {
    const wrapper = await mountSuspended(App)

    await findButton(wrapper, '繁體中文')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('決定接下來看什麼')
    expect(wrapper.text()).not.toContain('Decide what to watch')
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('zh-TW'))
  })
})

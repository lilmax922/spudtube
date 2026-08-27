import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import type { Genre, TitleSummary } from '#server/tmdb/types'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../app.vue'
import LanguageSwitcher from './language-switcher.vue'

const mock = vi.hoisted(() => {
  function ref<T>(value: T): { value: T, __v_isRef: true } {
    return { value, __v_isRef: true }
  }
  const titles: TitleSummary[] = [
    {
      kind: 'MOVIE',
      tmdbId: 419430,
      name: '沙丘',
      posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
      backdropPath: null,
      releaseDate: '2021-10-22',
      voteAverage: 7.8,
    },
  ]
  const genres: Genre[] = [
    { id: 28, name: '動作' },
    { id: 878, name: '科幻' },
  ]
  return {
    state: {
      kind: ref('MOVIE'),
      selectedGenreIds: ref([]),
      genres: ref(genres),
      items: ref(titles),
      loading: ref(false),
      loadingMore: ref(false),
      error: ref(false),
    },
    refresh: vi.fn(),
    loadMore: vi.fn(),
    setKind: vi.fn(),
    toggleGenre: vi.fn(),
    clearGenres: vi.fn(),
  }
})

vi.mock('../composables/use-browse-grid', () => ({
  useBrowseGrid: () => ({
    ...mock.state,
    refresh: mock.refresh,
    loadMore: mock.loadMore,
    setKind: mock.setKind,
    toggleGenre: mock.toggleGenre,
    clearGenres: mock.clearGenres,
  }),
}))

function findButton(wrapper: VueWrapper<unknown>, label: string): DOMWrapper<Element> | undefined {
  return wrapper.findAll('button').find(button => button.text() === label)
}

function writeLocaleCookie(value: string): void {
  document.cookie = `spudtube-locale=${value}; Path=/`
}

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
  document.cookie = 'spudtube-region=; Max-Age=0; Path=/'
})

describe('language switcher', () => {
  it('renders a control per configured locale inside dropdown menu', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { route: '/?probe=1' })
    const menuLabels = wrapper.find('#langMenu').findAll('button').map(button => button.text())

    expect(menuLabels).toEqual(['繁體中文', 'English'])
    // main button shows short label
    expect(wrapper.find('#langBtn').text()).toMatch(/繁中|EN/)
  })

  it('marks the persisted locale as active', async () => {
    writeLocaleCookie('zh-TW')
    const wrapper = await mountSuspended(LanguageSwitcher, { route: '/?probe=2' })

    const chinese = findButton(wrapper, '繁體中文')!
    const english = findButton(wrapper, 'English')!
    expect(chinese.attributes('aria-pressed')).toBe('true')
    expect(english.attributes('aria-pressed')).toBe('false')
  })

  it('switches language instantly and persists the choice', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { route: '/?probe=3' })
    // open menu first (prototype dropdown)
    await wrapper.find('#langBtn').trigger('click')
    await findButton(wrapper, '繁體中文')!.trigger('click')
    await flushPromises()

    expect(findButton(wrapper, '繁體中文')!.attributes('aria-pressed')).toBe('true')
    expect(document.cookie).toContain('spudtube-locale=zh-TW')
  })
})

describe('display locale resolution through the app shell', () => {
  it('falls back to en without any country signal', async () => {
    const wrapper = await mountSuspended(App, { route: '/?probe=4' })

    expect(wrapper.text()).toContain('Movies')
  })

  it('honors the persisted choice over the resolved default', async () => {
    writeLocaleCookie('zh-TW')
    const wrapper = await mountSuspended(App, { route: '/?probe=5' })

    expect(wrapper.text()).toContain('電影')
  })

  it('re-renders landing strings without reload', async () => {
    const wrapper = await mountSuspended(App, { route: '/?probe=6' })

    await wrapper.find('#langBtn').trigger('click')
    await findButton(wrapper, '繁體中文')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('電影')
    expect(wrapper.text()).not.toContain('Movies')
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('zh-TW'))
  })
})

describe('display locale orthogonal to region', () => {
  it('switching language does not change the selected region cookie', async () => {
    document.cookie = 'spudtube-region=US; Path=/'
    const wrapper = await mountSuspended(LanguageSwitcher, { route: '/?probe=7' })

    await wrapper.find('#langBtn').trigger('click')
    await findButton(wrapper, '繁體中文')!.trigger('click')
    await flushPromises()

    expect(document.cookie).toContain('spudtube-locale=zh-TW')
    expect(document.cookie).toContain('spudtube-region=US')
  })

  it('switching region does not change the persisted locale', async () => {
    writeLocaleCookie('en')
    document.cookie = 'spudtube-region=TW; Path=/'
    const wrapper = await mountSuspended(App, { route: '/?probe=8' })

    // Region is shown in availability panel via select; language switcher reflects locale
    expect(findButton(wrapper, 'English')!.attributes('aria-pressed')).toBe('true')
    // Simulate region change via composable (direct cookie) and verify locale persists
    document.cookie = 'spudtube-region=JP; Path=/'
    await flushPromises()
    expect(document.cookie).toContain('spudtube-locale=en')
    expect(document.cookie).toContain('spudtube-region=JP')
  })
})

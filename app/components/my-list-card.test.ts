import type { MyListEntry } from '#server/api/my-list.get'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import MyListCard from './my-list-card.vue'

const fetchMock = vi.hoisted(() => vi.fn(() => Promise.resolve({})))

mockNuxtImport('$fetch', () => fetchMock)

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: ref({ user: { id: 'test-user', name: 'Test' } }) }),
  },
}))

function makeEntry(overrides: Partial<MyListEntry> = {}): MyListEntry {
  return {
    kind: 'MOVIE',
    tmdbId: 424,
    title: {
      kind: 'MOVIE',
      tmdbId: 424,
      name: '沙丘',
      posterPath: '/poster.jpg',
      backdropPath: null,
      releaseDate: '2021-10-22',
      voteAverage: 7.8,
    },
    monetization: ['subscription'],
    providers: [
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg' },
      { id: 119, name: 'Amazon Prime Video', logoPath: '/prime.jpg' },
    ],
    watchLink: 'https://www.themoviedb.org/movie/424/watch?locale=TW',
    status: null,
    ratingLabel: null,
    ...overrides,
  }
}

beforeEach(() => {
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
  fetchMock.mockClear()
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

describe('myListCard', () => {
  it('renders poster and title link to detail page', async () => {
    const entry = makeEntry()
    const wrapper = await mountSuspended(MyListCard, { props: { entry } })
    expect(wrapper.text()).toContain('沙丘')
    const links = wrapper.findAll('a')
    const titleLink = links.find(a => a.text().includes('沙丘'))
    expect(titleLink).toBeTruthy()
    expect(titleLink!.attributes('href')).toBe('/movie/424')
    const img = wrapper.find('img[alt="沙丘"]')
    expect(img.exists()).toBe(true)
  })

  it('renders degraded state when title is null', async () => {
    const entry = makeEntry({ title: null })
    const wrapper = await mountSuspended(MyListCard, { props: { entry } })
    expect(wrapper.text()).toMatch(/已從目錄移除|No longer in catalog/)
  })

  it('renders providers as links when watchLink present and as plain when absent', async () => {
    const withLink = makeEntry()
    const wrapper = await mountSuspended(MyListCard, { props: { entry: withLink } })
    const link = wrapper.find('a[aria-label="Netflix"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe(withLink.watchLink)

    const withoutLink = makeEntry({ watchLink: null })
    const wrapper2 = await mountSuspended(MyListCard, { props: { entry: withoutLink } })
    expect(wrapper2.find('a[aria-label="Netflix"]').exists()).toBe(false)
    expect(wrapper2.find('[title="Netflix"]').exists()).toBe(true)
  })

  it('shows active state for watch status and rating', async () => {
    const entry = makeEntry({ status: 'WATCHLISTED', ratingLabel: 'GOOD' })
    const wrapper = await mountSuspended(MyListCard, { props: { entry } })
    const watchlisted = wrapper.findAll('button[aria-pressed="true"]')
    expect(watchlisted.length).toBeGreaterThan(0)
    const pressedLabels = watchlisted.map(b => b.attributes('aria-label') ?? '')
    expect(pressedLabels.some(l => l.includes('已在待看清單') || l.includes('In watchlist'))).toBe(true)
  })

  it('toggles watch status and emits updated on success', async () => {
    const entry = makeEntry({ status: null })
    const wrapper = await mountSuspended(MyListCard, { props: { entry } })
    const bookmark = wrapper.findAll('button').find(b => b.attributes('aria-label')?.includes('待看清單') || b.attributes('aria-label')?.includes('watchlist'))
    expect(bookmark).toBeTruthy()
    await bookmark!.trigger('click')
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/status/movie/424'), expect.objectContaining({ method: 'PUT' }))
    await vi.waitFor(() => {
      expect(wrapper.emitted('updated')).toBeTruthy()
    })
  })

  it('toggles rating and emits updated', async () => {
    const entry = makeEntry({ ratingLabel: null })
    const wrapper = await mountSuspended(MyListCard, { props: { entry } })
    const trigger = wrapper.findAll('button').find(b => b.attributes('aria-label')?.includes('評價這部片') || b.attributes('aria-label')?.includes('Rate this title'))
    expect(trigger).toBeTruthy()
    await trigger!.trigger('click')
    const goodBtn = wrapper.findAll('button[aria-label]').find(b => b.attributes('aria-label')?.includes('不錯') || b.attributes('aria-label')?.includes('Good'))
    expect(goodBtn).toBeTruthy()
    await goodBtn!.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 650))
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/ratings/movie/424'), expect.objectContaining({ method: 'PUT' }))
    await vi.waitFor(() => {
      expect(wrapper.emitted('updated')).toBeTruthy()
    })
  })
})

import type { VueWrapper } from '@vue/test-utils'
import type { Ref } from 'vue'
import type { MyList } from '#server/api/my-list.get'
import type { DiscoveryBadges, ProviderCatalog } from '#server/tmdb/types'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import MyListPage from './my-list.vue'

const signedIn = ref<{ user: { name: string } } | null>({ user: { name: 'Max' } })

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: signedIn }),
  },
  signIn: {
    social: vi.fn(),
  },
}))

const badgesMock = vi.hoisted(() => ({
  badges: {
    data: { value: null as DiscoveryBadges | null | undefined },
  },
}))

vi.mock('../composables/use-discovery-badges', () => ({
  useDiscoveryBadges: () => ({ badges: badgesMock.badges }),
}))

const availabilityMock = vi.hoisted(() => ({
  catalog: {
    data: { value: null as ProviderCatalog | null | undefined },
    pending: { value: false },
    error: { value: null as Error | null },
  },
  loadCatalog: vi.fn(),
}))

vi.mock('../composables/use-availability', () => ({
  useAvailability: () => availabilityMock,
}))

const EMPTY_LIST: MyList = { watchlist: [], watched: [], rated: [] }

const FILLED_LIST: MyList = {
  watchlist: [
    {
      kind: 'MOVIE',
      tmdbId: 424,
      title: {
        kind: 'MOVIE',
        tmdbId: 424,
        name: '沙丘',
        posterPath: '/d5NXSklXoIq1Ue0nbpZppWPop2P.jpg',
        backdropPath: null,
        releaseDate: '2021-10-22',
        voteAverage: 7.8,
      },
    },
  ],
  watched: [
    {
      kind: 'MOVIE',
      tmdbId: 999,
      title: null,
    },
  ],
  rated: [],
}

// The page's list fetch is mocked at the import site (seam S3); each test controls the
// response through the shared fixture, sidestepping useFetch's per-URL response cache.
let listFixture: MyList = EMPTY_LIST

mockNuxtImport('useFetch', () => (_url: string) => ({
  data: ref(listFixture) as Ref<MyList>,
  pending: ref(false),
  error: ref(null),
}))

beforeEach(() => {
  listFixture = EMPTY_LIST
  document.cookie = 'spudtube-locale=zh-TW; Path=/'
})

afterEach(() => {
  document.cookie = 'spudtube-locale=; Max-Age=0; Path=/'
})

async function renderPage(): Promise<VueWrapper<InstanceType<typeof MyListPage>>> {
  return await mountSuspended(MyListPage, { route: '/my-list' })
}

describe('my list route', () => {
  it('renders three tabs and the empty watchlist state for a signed-in user', async () => {
    signedIn.value = { user: { name: 'Max' } }

    const wrapper = await renderPage()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('待看清單還沒有任何作品。')
    })

    expect(wrapper.text()).toContain('我的片單')
    for (const label of ['待看清單', '已看過', '已評分'])
      expect(wrapper.findAll('button[role="tab"]').some(button => button.text() === label)).toBe(true)
  })

  it('renders watchlist entries with live details linking to their detail pages', async () => {
    signedIn.value = { user: { name: 'Max' } }
    listFixture = FILLED_LIST

    const wrapper = await renderPage()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘')
    })

    const link = wrapper.findAll('a').find(anchor => anchor.text().includes('沙丘'))
    expect(link?.attributes('href')).toBe('/movie/424')
  })

  it('renders a removed reference as a degraded entry without breaking the list', async () => {
    signedIn.value = { user: { name: 'Max' } }
    listFixture = FILLED_LIST

    const wrapper = await renderPage()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘')
    })

    const watchedTab = wrapper.findAll('button[role="tab"]').find(button => button.text() === '已看過')
    await watchedTab!.trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('已從目錄移除')
    })

    expect(wrapper.text()).toContain('已從目錄移除')
  })

  it('switches tabs and shows the corresponding set', async () => {
    signedIn.value = { user: { name: 'Max' } }
    listFixture = FILLED_LIST

    const wrapper = await renderPage()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('沙丘')
    })

    const watchedTab = wrapper.findAll('button[role="tab"]').find(button => button.text() === '已看過')
    await watchedTab!.trigger('click')

    expect(wrapper.text()).toContain('已從目錄移除')
    expect(wrapper.findAll('a').some(anchor => anchor.text().includes('沙丘'))).toBe(false)
  })
})

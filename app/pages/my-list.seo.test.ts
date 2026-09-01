import type { MyList } from '#server/api/my-list.get'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import MyListPage from './my-list.vue'

const signedIn = ref<{ user: { name: string } } | null>({ user: { name: 'Max' } })

vi.mock('../lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: signedIn }) },
  signIn: { social: vi.fn() },
}))

vi.mock('../composables/use-discovery-badges', () => ({
  useDiscoveryBadges: () => ({ badges: { data: { value: null } } }),
}))

vi.mock('../composables/use-availability', () => ({
  useAvailability: () => ({ catalog: { data: { value: null }, pending: { value: false }, error: { value: null } }, loadCatalog: vi.fn() }),
}))

const EMPTY_LIST: MyList = { watchlist: [], watched: [], rated: [], region: 'TW' }

let listFixture: MyList = EMPTY_LIST

mockNuxtImport('useFetch', () => (_url: string) => ({
  data: ref(listFixture),
  pending: ref(false),
  error: ref(null),
}))

beforeEach(() => {
  listFixture = EMPTY_LIST
  signedIn.value = { user: { name: 'Max' } }
})

afterEach(() => {
})

function robotsContent(): string | null {
  return document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null
}

describe('my-list page SEO', () => {
  it('sets robots noindex,nofollow', async () => {
    await mountSuspended(MyListPage, { route: '/my-list' })
    await vi.waitFor(() => expect(robotsContent()).toBeTruthy())
    const content = robotsContent()!
    expect(content.includes('noindex')).toBe(true)
    expect(content.includes('nofollow')).toBe(true)
  })
})

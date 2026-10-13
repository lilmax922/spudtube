import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import App from './app.vue'
import TheHeader from './components/the-header.vue'

const mock = vi.hoisted(() => ({
  signInSocial: vi.fn(),
  toast: vi.fn(),
  toastDismiss: vi.fn(),
}))

vi.mock('./composables/use-browse-listing', () => ({
  useBrowseListing: () => ({
    kind: ref<'MOVIE' | 'TV_SHOW'>('MOVIE'),
    setKind: vi.fn(),
  }),
}))

vi.mock('./lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: ref(null) }),
  },
  signIn: { social: mock.signInSocial },
  signOut: vi.fn(),
}))

vi.mock('vue-sonner', () => ({
  toast: Object.assign(mock.toast, { dismiss: mock.toastDismiss }),
  Toaster: { template: '<div />' },
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      locale: ref('zh-TW'),
      t: (key: string) => key,
      setLocale: vi.fn(),
    }),
  }
})

async function emitHeaderSignIn() {
  // A route with no page match keeps NuxtPage empty so the test mounts only
  // the header shell (the sign-in handler lives in app.vue, not in any page).
  const wrapper = await mountSuspended(App, { route: '/signin-probe' })
  wrapper.findComponent(TheHeader).vm.$emit('sign-in')
  await flushPromises()
}

describe('global sign-in', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('shows a server-error toast when Google sign-in fails', async () => {
    mock.signInSocial.mockRejectedValueOnce(new Error('database paused'))
    await emitHeaderSignIn()
    expect(mock.toast).toHaveBeenCalledWith('auth.signInError', expect.anything())
  })

  it('stays silent when Google sign-in succeeds', async () => {
    mock.signInSocial.mockResolvedValueOnce({ data: null, error: null })
    await emitHeaderSignIn()
    expect(mock.toast).not.toHaveBeenCalled()
  })
})

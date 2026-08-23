import type { RouteLocationNormalized } from 'vue-router'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import myListMiddleware from './my-list'

const session = ref<{ user: { name: string } } | null>(null)

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => Promise.resolve({ data: session, isPending: false, error: null }),
  },
  signIn: {
    social: vi.fn(),
  },
}))

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateTo)

const to = { fullPath: '/my-list' } as RouteLocationNormalized
const from = { fullPath: '/' } as RouteLocationNormalized

describe('my-list middleware', () => {
  it('bounces signed-out visitors to the home page', async () => {
    session.value = null

    await myListMiddleware(to, from)

    expect(navigateTo).toHaveBeenCalledWith('/')
  })

  it('lets signed-in users through to the list', async () => {
    session.value = { user: { name: 'Max' } }
    navigateTo.mockClear()

    await myListMiddleware(to, from)

    expect(navigateTo).not.toHaveBeenCalled()
  })
})

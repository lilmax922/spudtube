import { defineNuxtRouteMiddleware, navigateTo, useFetch } from '#imports'
import { authClient } from '../lib/auth-client'

// Personal-list pages require a session: signed-out visitors bounce to the home page
// instead of seeing the list UI. Same session source as the pages (`useSession(useFetch)`),
// so SSR redirects carry the real request cookies.
export default defineNuxtRouteMiddleware(async () => {
  const { data } = await authClient.useSession(useFetch)
  if (!data.value?.user)
    return navigateTo('/')
})

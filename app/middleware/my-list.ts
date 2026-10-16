import { defineNuxtRouteMiddleware, navigateTo, useFetch } from '#imports'
import { authClient } from '../lib/auth-client'

// Same session source as the pages (`useSession(useFetch)`), so SSR redirects
// carry the real request cookies.
export default defineNuxtRouteMiddleware(async () => {
  const { data } = await authClient.useSession(useFetch)
  if (!data.value?.user)
    return navigateTo('/')
})

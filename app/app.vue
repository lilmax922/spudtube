<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { defineOgImage, navigateTo, useFetch, useHead, useSiteConfig } from '#imports'
import SearchOverlay from './components/search-overlay.vue'
import TheFooter from './components/the-footer.vue'
import TheHeader from './components/the-header.vue'
import { Toaster } from './components/ui/sonner'
import { useMediaLightboxState } from './composables/use-media-lightbox'
import { useTrailerState } from './composables/use-trailer'
import { authClient, signIn, signOut } from './lib/auth-client'
import { buildCanonicalUrl, getOgLocale, getOgLocaleAlternate, SEO_DESCRIPTIONS, SEO_TITLES } from './lib/seo'

const { locale } = useI18n()

const siteConfig = useSiteConfig()
const localeTitle = computed(() => locale.value === 'zh-TW' ? SEO_TITLES['zh-TW'] : SEO_TITLES.en)
const localeDescription = computed(() => locale.value === 'zh-TW' ? SEO_DESCRIPTIONS['zh-TW'] : SEO_DESCRIPTIONS.en)
const ogLocale = computed(() => getOgLocale(locale.value))
const ogLocaleAlternate = computed(() => getOgLocaleAlternate(locale.value))
const canonicalUrl = computed(() => buildCanonicalUrl(siteConfig.url as string | undefined, '/'))

useHead(() => ({
  title: localeTitle.value,
  titleTemplate: '%s',
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  meta: [
    { name: 'description', content: localeDescription.value },
    { property: 'og:title', content: localeTitle.value },
    { property: 'og:description', content: localeDescription.value },
    { property: 'og:locale', content: ogLocale.value },
    { property: 'og:locale:alternate', content: ogLocaleAlternate.value },
  ],
}))
defineOgImage('SpudTube', { title: localeTitle, description: localeDescription })

const { data: session } = await authClient.useSession(useFetch)

const isSearchOpen = shallowRef(false)
const overlayQuery = shallowRef('')
const { isOpen: isTrailerOpen } = useTrailerState()
const { isOpen: isMediaLightboxOpen } = useMediaLightboxState()
const isOverlayOpen = computed(() => isTrailerOpen.value || isMediaLightboxOpen.value)

function openSearch(): void {
  isSearchOpen.value = true
}

function toggleSearch(): void {
  isSearchOpen.value = !isSearchOpen.value
}

function closeSearch(): void {
  isSearchOpen.value = false
}

function onSearchInput(value: string): void {
  overlayQuery.value = value
}

function onClearSearch(): void {
  overlayQuery.value = ''
}

async function onSignIn(): Promise<void> {
  await signIn.social({ provider: 'google' })
}

async function onSignOut(): Promise<void> {
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background">
    <TheHeader
      :user="session?.user ?? null"
      :is-overlay-open="isOverlayOpen"
      @sign-in="onSignIn"
      @sign-out="onSignOut"
      @open-search="openSearch"
      @toggle-search="toggleSearch"
    />
    <SearchOverlay
      :query="overlayQuery"
      :open="isSearchOpen"
      :clearable="false"
      @update:query="onSearchInput"
      @clear="onClearSearch"
      @close="closeSearch"
    />
    <main class="flex-1 pt-[var(--header-h)]">
      <NuxtPage />
    </main>
    <Toaster
      position="bottom-right"
      theme="dark"
      rich-colors
      close-button
      close-button-position="top-right"
    />
    <TheFooter />
  </div>
</template>

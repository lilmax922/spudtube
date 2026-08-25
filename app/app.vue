<script setup lang="ts">
import { Search } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { navigateTo, useFetch, useHead } from '#imports'
import AccountMenu from './components/account-menu.vue'
import AttributionFooter from './components/attribution-footer.vue'
import LanguageSwitcher from './components/language-switcher.vue'
import SearchOverlay from './components/search-overlay.vue'
import { useSearchState } from './composables/use-search-state'
import { authClient, signIn, signOut } from './lib/auth-client'

const { locale, t } = useI18n()
const { query, mode, search, clear } = useSearchState()

const { data: session } = await authClient.useSession(useFetch)

const isSearchOpen = shallowRef(false)

const debouncedSearch = useDebounceFn((nextQuery: string) => {
  void search(nextQuery)
}, 350)

function openSearch(): void {
  isSearchOpen.value = true
}

function closeSearch(): void {
  isSearchOpen.value = false
}

function onSearchInput(value: string): void {
  query.value = value
  debouncedSearch(value)
}

function onSubmitSearch(): void {
  debouncedSearch.cancel()
  void search(query.value)
}

function onClearSearch(): void {
  debouncedSearch.cancel()
  clear()
}

async function onSignIn(): Promise<void> {
  await signIn.social({ provider: 'google' })
}

async function onSignOut(): Promise<void> {
  await signOut()
  await navigateTo('/')
}

useHead(() => ({ htmlAttrs: { lang: locale.value } }))
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-background">
    <header class="border-b border-border">
      <div class="mx-auto flex w-full max-w-[1280px] items-center gap-6 px-6 py-4">
        <span class="text-lg font-semibold tracking-tight">SpudTube</span>
        <div class="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            :aria-label="t('search.open')"
            class="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            @click="openSearch"
          >
            <Search :size="18" :stroke-width="1.75" aria-hidden="true" />
          </button>
        </div>
        <div class="flex items-center gap-3">
          <LanguageSwitcher />
          <NuxtLink
            v-if="session?.user"
            to="/my-list"
            class="inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            {{ t('myList.heading') }}
          </NuxtLink>
          <AccountMenu
            :user="session?.user ?? null"
            @sign-in="onSignIn"
            @sign-out="onSignOut"
          />
        </div>
      </div>
    </header>
    <SearchOverlay
      :query="query"
      :open="isSearchOpen"
      :clearable="mode === 'search'"
      @update:query="onSearchInput"
      @search="onSubmitSearch"
      @clear="onClearSearch"
      @close="closeSearch"
    />
    <main class="flex-1">
      <NuxtPage />
    </main>
    <AttributionFooter />
  </div>
</template>

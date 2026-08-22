<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useFetch, useHead } from '#imports'
import AccountMenu from './components/account-menu.vue'
import LanguageSwitcher from './components/language-switcher.vue'
import SearchField from './components/search-field.vue'
import { useSearchState } from './composables/use-search-state'
import { authClient, signIn, signOut } from './lib/auth-client'

const { locale } = useI18n()
const { query, search, clear } = useSearchState()

const { data: session } = await authClient.useSession(useFetch)

const debouncedSearch = useDebounceFn((nextQuery: string) => {
  void search(nextQuery)
}, 350)

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
}

useHead(() => ({ htmlAttrs: { lang: locale.value } }))
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="border-b">
      <div class="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-4">
        <span class="text-lg font-semibold tracking-tight">SpudTube</span>
        <div class="flex min-w-0 flex-1 justify-center">
          <SearchField
            :query="query"
            @update:query="onSearchInput"
            @search="onSubmitSearch"
            @clear="onClearSearch"
          />
        </div>
        <div class="flex items-center gap-3">
          <LanguageSwitcher />
          <AccountMenu
            :user="session?.user ?? null"
            @sign-in="onSignIn"
            @sign-out="onSignOut"
          />
        </div>
      </div>
    </header>
    <main class="flex-1">
      <NuxtPage />
    </main>
  </div>
</template>

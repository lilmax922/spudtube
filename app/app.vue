<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { navigateTo, useFetch, useHead } from '#imports'
import AccountMenu from './components/account-menu.vue'
import LanguageSwitcher from './components/language-switcher.vue'
import { authClient, signIn, signOut } from './lib/auth-client'

const { locale, t } = useI18n()

const { data: session } = await authClient.useSession(useFetch)

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
  <div class="flex min-h-dvh flex-col">
    <header class="border-b">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <span class="text-lg font-semibold tracking-tight">SpudTube</span>
        <div class="flex items-center gap-3">
          <LanguageSwitcher />
          <NuxtLink
            v-if="session?.user"
            to="/my-list"
            class="inline-flex h-[38px] items-center rounded-[10px] px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
    <main class="flex-1">
      <NuxtPage />
    </main>
  </div>
</template>

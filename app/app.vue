<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useFetch, useHead } from '#imports'
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
          <AccountMenu
            :user="session?.user ?? null"
            @sign-in="onSignIn"
            @sign-out="onSignOut"
          />
        </div>
      </div>
    </header>
    <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10">
      <h1 class="text-3xl font-bold tracking-tight">
        {{ t('home.title') }}
      </h1>
      <p class="mt-2 max-w-prose text-muted-foreground">
        {{ t('home.tagline') }}
      </p>
    </main>
  </div>
</template>

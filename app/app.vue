<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useHead } from '#imports'
import BrowseGrid from './components/browse-grid.vue'
import LanguageSwitcher from './components/language-switcher.vue'

const { locale } = useI18n()

useHead(() => ({ htmlAttrs: { lang: locale.value } }))
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="pointer-events-none sticky top-4 z-10 px-4">
      <div class="pointer-events-auto mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-border bg-card/80 px-4 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
        <span class="text-base font-semibold tracking-tight">SpudTube</span>
        <LanguageSwitcher />
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <BrowseGrid />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCookie } from '#imports'
import { isAppLocale, LOCALE_COOKIE } from '#shared/i18n/locale'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const { locale, locales, setLocale, t } = useI18n()
const localeCookie = useCookie(LOCALE_COOKIE, { maxAge: COOKIE_MAX_AGE_SECONDS, path: '/', sameSite: 'lax' })

async function choose(candidate: string): Promise<void> {
  if (!isAppLocale(candidate) || candidate === locale.value) {
    return
  }
  await setLocale(candidate)
  localeCookie.value = candidate
}
</script>

<template>
  <nav class="flex items-center gap-1" :aria-label="t('language.label')">
    <button
      v-for="item in locales"
      :key="item.code"
      type="button"
      class="rounded px-2 py-1 text-sm transition-colors hover:bg-muted focus-visible:outline-2"
      :class="item.code === locale ? 'font-medium text-foreground' : 'text-muted-foreground'"
      :aria-pressed="item.code === locale"
      @click="choose(item.code)"
    >
      {{ item.name }}
    </button>
  </nav>
</template>

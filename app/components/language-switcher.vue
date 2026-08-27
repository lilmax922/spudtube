<script setup lang="ts">
import { Check, Globe } from '@lucide/vue'
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCookie } from '#imports'
import { isAppLocale, LOCALE_COOKIE } from '#shared/i18n/locale'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const { locale, locales, setLocale, t } = useI18n()
const localeCookie = useCookie(LOCALE_COOKIE, { maxAge: COOKIE_MAX_AGE_SECONDS, path: '/', sameSite: 'lax' })

const isOpen = shallowRef(false)
const wrapRef = shallowRef<HTMLElement | null>(null)

function currentShort(): string {
  return locale.value === 'zh-TW' ? '繁中' : 'EN'
}

async function choose(candidate: string): Promise<void> {
  if (!isAppLocale(candidate) || candidate === locale.value) {
    isOpen.value = false
    return
  }
  await setLocale(candidate)
  localeCookie.value = candidate
  isOpen.value = false
}

function toggle(): void {
  isOpen.value = !isOpen.value
}

function onDocumentClick(event: MouseEvent): void {
  if (!wrapRef.value)
    return
  if (!wrapRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    id="langWrap"
    ref="wrapRef"
    class="relative"
  >
    <button
      id="langBtn"
      type="button"
      class="inline-flex h-[38px] items-center gap-1.5 rounded-full border border-transparent bg-transparent px-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-label="t('language.label')"
      @click="toggle"
    >
      <Globe :size="18" :stroke-width="1.75" aria-hidden="true" />
      <span id="langLabel">{{ currentShort() }}</span>
    </button>
    <div
      id="langMenu"
      role="menu"
      :hidden="!isOpen"
      class="absolute right-0 top-[calc(100%+8px)] z-80 min-w-[168px] rounded-xl border border-border bg-popover p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
    >
      <button
        v-for="item in locales"
        :key="item.code"
        type="button"
        role="menuitem"
        :data-lang="item.code"
        :aria-pressed="item.code === locale"
        class="flex w-full items-center justify-between gap-3.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        @click="choose(item.code)"
      >
        <span>{{ item.name }}</span>
        <span
          class="check inline-flex text-foreground"
          :style="{ visibility: item.code === locale ? 'visible' : 'hidden' }"
        >
          <Check :size="15" :stroke-width="2.4" aria-hidden="true" />
        </span>
      </button>
    </div>
  </div>
</template>

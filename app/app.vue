<script setup lang="ts">
import { Search } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { navigateTo, useFetch, useHead } from '#imports'
import AccountMenu from './components/account-menu.vue'
import AttributionFooter from './components/attribution-footer.vue'
import LanguageSwitcher from './components/language-switcher.vue'
import SearchOverlay from './components/search-overlay.vue'
import { useBrowseGrid } from './composables/use-browse-grid'
import { useSearchState } from './composables/use-search-state'
import { authClient, signIn, signOut } from './lib/auth-client'

const { locale, t } = useI18n()
const { query, mode, search, clear } = useSearchState()
const { kind: browseKind, setKind } = useBrowseGrid()

const { data: session } = await authClient.useSession(useFetch)

const isSearchOpen = shallowRef(false)
const isScrolled = shallowRef(false)

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

function handlePrimeNav(kind: 'MOVIE' | 'TV_SHOW'): void {
  setKind(kind)
}

function goHome(): void {
  void navigateTo('/')
}

function onScroll(): void {
  const y = typeof window === 'undefined' ? 0 : window.scrollY
  isScrolled.value = y > 50
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

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
    <header
      id="siteHeader"
      :class="{ scrolled: isScrolled }"
    >
      <div class="header-inner">
        <span
          class="logo"
          tabindex="0"
          role="button"
          aria-label="SpudTube 首頁"
          @click="goHome"
          @keydown.enter.prevent="goHome"
          @keydown.space.prevent="goHome"
        >
          <span class="pot">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF0000"><path d="M12 3c-3.8 0-6.5 1.8-7.4 4.4C3.2 8.2 3 9 3 10c0 2 .8 3.4 2 4.8V19c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4.2c1.2-1.4 2-2.8 2-4.8 0-1-.2-1.8-.6-2.6C18.5 4.8 15.8 3 12 3zM8.5 8.5A1.5 1.5 0 1 1 8.5 11.5 1.5 1.5 0 0 1 8.5 8.5zm7 0a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5zM12 13a1.5 1.5 0 1 1-1.5 1.5A1.5 1.5 0 0 1 12 13z" /></svg>
          </span>
          SpudTube
        </span>
        <nav id="primeNav" :aria-label="t('browse.kindLabel')">
          <button
            type="button"
            class="primeNavBtn"
            :class="{ on: browseKind === 'MOVIE' }"
            data-kind="movie"
            :aria-pressed="browseKind === 'MOVIE'"
            @click="handlePrimeNav('MOVIE')"
          >
            {{ t('browse.kindMovies') }}
          </button>
          <button
            type="button"
            class="primeNavBtn"
            :class="{ on: browseKind === 'TV_SHOW' }"
            data-kind="tv"
            :aria-pressed="browseKind === 'TV_SHOW'"
            @click="handlePrimeNav('TV_SHOW')"
          >
            {{ t('browse.kindTvShows') }}
          </button>
        </nav>
        <nav id="appnav" aria-label="主要導覽">
          <button
            id="searchOpenBtn"
            type="button"
            :aria-label="t('search.open')"
            class="ghost"
            @click="openSearch"
          >
            <Search :size="18" :stroke-width="1.75" aria-hidden="true" />
          </button>
          <NuxtLink
            v-if="session?.user"
            to="/my-list"
            data-nav="list"
            class="ghost"
          >
            {{ t('myList.heading') }}
          </NuxtLink>
          <LanguageSwitcher />
          <AccountMenu
            :user="session?.user ?? null"
            @sign-in="onSignIn"
            @sign-out="onSignOut"
          />
        </nav>
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
    <main class="flex-1 pt-[var(--header-h)]">
      <NuxtPage />
    </main>
    <AttributionFooter />
  </div>
</template>

<style scoped>
#siteHeader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 24px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.35) 45%, transparent 100%);
  border-bottom: none;
  transition: background 0.28s ease, backdrop-filter 0.28s ease;
}
#siteHeader.scrolled {
  background: rgba(15, 15, 15, 0.96);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.header-inner {
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 18px;
}
.logo {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  padding: 6px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  color: var(--foreground);
}
.logo .pot {
  color: #FF0000;
  display: inline-flex;
}
.logo:hover {
  background: rgba(255, 255, 255, 0.06);
}
#primeNav {
  display: flex;
  gap: 2px;
  align-items: center;
  margin-left: 4px;
}
.primeNavBtn {
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
  transition: background 0.16s, color 0.16s;
  background: transparent;
  border: none;
  cursor: pointer;
}
.primeNavBtn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.primeNavBtn.on {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}
#siteHeader.scrolled .primeNavBtn.on {
  background: rgba(255, 255, 255, 0.14);
}
#appnav {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
}
#appnav :deep(a),
#appnav a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 13px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  text-decoration: none;
}
#appnav a.ghost,
#appnav .ghost {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted-foreground);
}
#appnav a.ghost:hover,
#appnav .ghost:hover {
  background: var(--muted);
  color: var(--foreground);
}
#appnav a.outline,
#appnav .outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--foreground);
}
#appnav a.outline:hover,
#appnav .outline:hover {
  background: var(--muted);
  border-color: var(--ring);
}
#appnav a.on {
  color: var(--foreground);
  background: var(--muted);
  border-color: var(--border);
}
#searchOpenBtn.ghost {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted-foreground);
  width: 38px;
  height: 38px;
  border-radius: 9999px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
#searchOpenBtn.ghost:hover {
  background: var(--muted);
  color: var(--foreground);
}
@media (max-width: 880px) {
  #primeNav {
    gap: 0;
  }
  .primeNavBtn {
    padding: 0 10px;
    font-size: 13px;
  }
}
@media (max-width: 560px) {
  #siteHeader {
    padding: 0 14px;
  }
  .logo {
    font-size: 17px;
  }
}
</style>

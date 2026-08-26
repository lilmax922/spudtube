<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useInfiniteScroll } from '../composables/use-infinite-scroll'
import TitleCard from './title-card.vue'

const { t } = useI18n()
const {
  items,
  loading,
  loadingMore,
  error,
  refresh,
  loadMore,
} = useBrowseGrid()

const sentinel = ref<HTMLElement | null>(null)

useInfiniteScroll(sentinel, () => {
  void loadMore()
})

void refresh()
</script>

<template>
  <section class="flex flex-col gap-6" :aria-label="t('browse.sectionLabel')">
    <p
      v-if="error && items.length === 0"
      class="rounded-lg bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
    >
      {{ t('browse.error') }}
    </p>

    <div
      v-else-if="loading && items.length === 0"
      class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 max-[880px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]"
      aria-busy="true"
    >
      <div
        v-for="index in 12"
        :key="index"
        class="aspect-[16/9] animate-pulse rounded-lg bg-muted"
      />
    </div>

    <p
      v-else-if="items.length === 0"
      class="rounded-lg bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
    >
      {{ t('browse.empty') }}
    </p>

    <div
      v-if="items.length > 0"
      class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 max-[880px]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] max-[560px]:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]"
      :aria-busy="loading || loadingMore"
    >
      <TitleCard
        v-for="title in items"
        :key="`${title.kind}-${title.tmdbId}`"
        :title="title"
        :show-kind="false"
      />
    </div>

    <div ref="sentinel" aria-hidden="true" />

    <p
      v-if="error && items.length > 0"
      class="text-center text-sm text-muted-foreground"
    >
      {{ t('browse.error') }}
    </p>

    <p
      v-if="loadingMore || (loading && items.length > 0)"
      class="flex items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <LoaderCircle :size="16" :stroke-width="1.75" class="animate-spin" aria-hidden="true" />
      {{ t('browse.loading') }}
    </p>
  </section>
</template>

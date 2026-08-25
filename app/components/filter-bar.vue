<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBrowseGrid } from '../composables/use-browse-grid'
import { useSearchState } from '../composables/use-search-state'

const { t } = useI18n()
const { genres, selectedGenreIds, toggleGenre, clearGenres, items } = useBrowseGrid()
const { mode } = useSearchState()

const show = computed(() => mode.value === 'browse')
const hasSelection = computed(() => selectedGenreIds.value.length > 0)
const countText = computed(() => {
  const n = items.value.length
  return `${t('browse.sectionLabel')} · ${n}`
})
</script>

<template>
  <div
    v-if="show"
    id="filterBar"
  >
    <div class="filter-inner">
      <template v-if="genres.length > 0">
        <button
          v-for="genre in genres"
          :key="genre.id"
          type="button"
          class="chip"
          :class="{ on: selectedGenreIds.includes(genre.id) }"
          :aria-pressed="selectedGenreIds.includes(genre.id)"
          :data-genre="String(genre.id)"
          @click="toggleGenre(genre.id)"
        >
          {{ genre.name }}
        </button>
        <span class="divider" aria-hidden="true" />
      </template>
      <button
        v-if="hasSelection"
        type="button"
        class="chip ghost"
        @click="clearGenres"
      >
        {{ t('browse.clearAll') }}
      </button>
      <span class="filterCount">{{ countText }}</span>
    </div>
  </div>
</template>

<style scoped>
#filterBar {
  position: sticky;
  top: var(--header-h);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 24px;
  background: rgba(20, 20, 22, 0.92);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.filter-inner {
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.chip {
  height: 30px;
  padding: 0 12px;
  border-radius: 9999px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--muted-foreground);
  border: 1px solid var(--input);
  background: transparent;
  transition: all 0.15s;
  cursor: pointer;
}
.chip:hover {
  color: var(--foreground);
  border-color: var(--ring);
}
.chip.on {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}
.chip.ghost {
  color: var(--foreground);
  border-color: var(--border);
}
.divider {
  width: 1px;
  height: 24px;
  background: var(--border);
  margin: 0 2px;
}
.filterCount {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--muted-foreground);
  font-weight: 500;
}
</style>

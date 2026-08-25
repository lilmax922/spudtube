<script setup lang="ts">
import type { Genre } from '#server/tmdb/types'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  genres: Genre[]
  modelValue: number[]
}>()
const emit = defineEmits<{ toggle: [genreId: number] }>()

const { t } = useI18n()

function isSelected(genreId: number): boolean {
  return props.modelValue.includes(genreId)
}
</script>

<template>
  <div class="flex flex-wrap gap-2" role="group" :aria-label="t('browse.genresLabel')">
    <button
      v-for="genre in genres"
      :key="genre.id"
      type="button"
      class="inline-flex min-h-10 h-[30px] items-center rounded-full border border-transparent px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      :class="isSelected(genre.id)
        ? 'bg-primary text-primary-foreground'
        : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'"
      :aria-pressed="isSelected(genre.id)"
      @click="emit('toggle', genre.id)"
    >
      {{ genre.name }}
    </button>
  </div>
</template>
